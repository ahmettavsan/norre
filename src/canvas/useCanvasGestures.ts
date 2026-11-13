import { useEffect, type RefObject } from 'react';
import { CARD_H, CARD_W, GAP, HEAD, PAD, ZOOM_MAX, ZOOM_MIN } from '../domain/constants';
import { clamp } from '../domain/format';
import {
  adoptLooseCards,
  assignRoom,
  clampRoomSize,
  membersOf,
  resizeLimits,
  settleCard,
  type ResizeLimits,
} from '../domain/geometry';
import { stackMap, stackOf } from '../domain/stacks';
import type { Board, Clip, View } from '../domain/types';
import {
  animateLayout,
  bringFront,
  closeDrawer,
  createGroupAt,
  createItemAt,
  joinStack,
  cancelClip,
  openCompare,
  openDrawer,
  placeClip,
  selectClip,
  startClip,
} from '../store/actions';
import { getState, setState, updateBoard } from '../store/appStore';
import { panBy, toWorld, trackPointer, zoomAt } from '../store/viewActions';

/* Pointer handling for the board: pan, pinch-zoom, wheel, moving cards and rooms, resizing, drawing rooms. */

interface Base {
  sx: number;
  sy: number;
  moved: boolean;
  pid: number;
}
type Pos = { x: number; y: number };

type Drag =
  | { kind: 'pinch'; d0: number; m0: Pos; v0: View }
  | (Base & {
      kind: 'clip' | 'clip-resize' | 'clip-rotate';
      id: string;
      /** The clip as it was when the gesture started. */
      orig: Clip;
      /** Its center, and the pointer's distance / angle from it, in board coordinates. */
      c: Pos;
      d0: number;
      a0: number;
    })
  | (Base & {
      kind: 'item';
      id: string;
      back: boolean;
      /** ⌘ (or Ctrl) was held: a click opens the side-by-side view of the stack. */
      compare: boolean;
      ids: Set<string>;
      orig: Map<string, Pos>;
    })
  | (Base & { kind: 'group'; id: string; ids: Set<string>; orig: Map<string, Pos> })
  | (Base & {
      kind: 'resize';
      id: string;
      ids: Set<string>;
      ow: number;
      oh: number;
      limits: ResizeLimits;
    })
  | (Base & { kind: 'draw'; wx: number; wy: number; cx: number; cy: number })
  | (Base & { kind: 'place' })
  | (Base & { kind: 'pan'; vx: number; vy: number });

/** Overlays living inside the viewport that must not start board gestures. */
const OVERLAYS = '.zoom,.drawer,.empty-card,.statbar,.toast,.fpanel,.quick-pay,.compare,.clip-bar';

/** Smallest side a cut-out can be resized to. */
const CLIP_MIN = 40;

/** Front card of another stack (or a loose card) under the dragged card's center. */
function findDropTarget(board: Board, id: string, ids: Set<string>): string | null {
  const me = board.items[id];
  if (!me) return null;
  const cx = me.x + CARD_W / 2;
  const cy = me.y + CARD_H / 2;
  const sm = stackMap(board);
  for (const [oid, o] of Object.entries(board.items)) {
    if (ids.has(oid)) continue;
    if (o.stack && sm.has(o.stack) && sm.get(o.stack)![0] !== oid) continue;
    if (cx > o.x + 24 && cx < o.x + CARD_W - 24 && cy > o.y + 24 && cy < o.y + CARD_H - 24) return oid;
  }
  return null;
}

export function useCanvasGestures(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const vp = ref.current;
    if (!vp) return;
    const pointers = new Map<number, Pos>();
    let drag: Drag | null = null;

    const local = (e: PointerEvent): Pos => {
      const r = vp.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    function onDown(e: PointerEvent) {
      const target = e.target as Element;
      if (target.closest(OVERLAYS)) return;
      // A cut-out follows the pointer: a click drops it, any other button gives up.
      if (getState().clipDraft) {
        if (e.button === 0) placeClip(toWorld(e.clientX, e.clientY));
        else cancelClip();
        return;
      }
      if (e.button === 2) {
        const card = target.closest<HTMLElement>('.tag');
        if (card && getState().tool === 'select')
          void startClip(card.dataset.id!, toWorld(e.clientX, e.clientY));
        return;
      }
      if (target.closest('.pill-btn,.stk')) return;
      pointers.set(e.pointerId, local(e));
      try {
        vp!.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already gone */
      }
      if (pointers.size === 2) {
        finishDrag(true);
        const [a, b] = [...pointers.values()];
        drag = {
          kind: 'pinch',
          d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          m0: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          v0: { ...getState().view },
        };
        return;
      }
      if (pointers.size > 2) return;

      const { tool, spacePan, board } = getState();
      const panMode = tool === 'hand' || spacePan || e.button === 1;
      const base: Base = { sx: e.clientX, sy: e.clientY, moved: false, pid: e.pointerId };
      const clipEl = target.closest<HTMLElement>('.clip');
      if (!panMode && tool === 'select' && clipEl) {
        const id = clipEl.dataset.id!;
        const c = board.clips[id];
        const center = { x: c.x + c.w / 2, y: c.y + c.h / 2 };
        const p = toWorld(e.clientX, e.clientY);
        selectClip(id);
        drag = {
          ...base,
          kind: target.closest('.clip-resize')
            ? 'clip-resize'
            : target.closest('.clip-rotate')
              ? 'clip-rotate'
              : 'clip',
          id,
          orig: { ...c },
          c: center,
          d0: Math.hypot(p.x - center.x, p.y - center.y) || 1,
          a0: Math.atan2(p.y - center.y, p.x - center.x),
        };
        return;
      }
      const tag = target.closest<HTMLElement>('.tag');
      const headEl = target.closest('.room-head');
      const rz = target.closest('.room-resize');

      if (!panMode && tool === 'select' && (tag || headEl || rz)) {
        if (tag) {
          const id = tag.dataset.id!;
          const all = stackOf(board, id)?.ids || [id];
          drag = {
            ...base,
            kind: 'item',
            id,
            back: tag.classList.contains('back'),
            compare: e.metaKey || e.ctrlKey,
            ids: new Set(all),
            orig: new Map(all.map((i) => [i, { x: board.items[i].x, y: board.items[i].y }])),
          };
        } else {
          const gid = (headEl || rz)!.closest<HTMLElement>('.room')!.dataset.id!;
          const g = board.groups[gid];
          if (rz) {
            drag = {
              ...base,
              kind: 'resize',
              id: gid,
              ids: new Set([gid]),
              ow: g.w,
              oh: g.h,
              limits: resizeLimits(board, gid),
            };
          } else {
            // Only the room's own cards travel with it, never the cards of a room it passes over.
            const inside = membersOf(board, gid);
            const orig = new Map<string, Pos>([[gid, { x: g.x, y: g.y }]]);
            for (const i of inside) orig.set(i, { x: board.items[i].x, y: board.items[i].y });
            drag = { ...base, kind: 'group', id: gid, ids: new Set([gid, ...inside]), orig };
          }
        }
        return;
      }
      if (!panMode && tool === 'room') {
        const w = toWorld(e.clientX, e.clientY);
        drag = { ...base, kind: 'draw', wx: w.x, wy: w.y, cx: w.x, cy: w.y };
        return;
      }
      if (!panMode && tool === 'item') {
        drag = { ...base, kind: 'place' };
        return;
      }
      const v = getState().view;
      drag = { ...base, kind: 'pan', vx: v.x, vy: v.y };
      setState({ panning: true });
    }

    function onMove(e: PointerEvent) {
      trackPointer(e.clientX, e.clientY);
      if (getState().clipDraft) setState({ clipCursor: toWorld(e.clientX, e.clientY) });
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, local(e));
      if (!drag) return;
      if (drag.kind === 'pinch') {
        if (pointers.size < 2) return;
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const { v0, m0, d0 } = drag;
        const k = clamp((v0.k * d) / d0, ZOOM_MIN, ZOOM_MAX);
        const wx = (m0.x - v0.x) / v0.k;
        const wy = (m0.y - v0.y) / v0.k;
        setState({ view: { k, x: m.x - wx * k, y: m.y - wy * k } });
        return;
      }
      if (e.pointerId !== drag.pid) return;
      const dxs = e.clientX - drag.sx;
      const dys = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dxs, dys) > 4) {
        drag.moved = true;
        if ('ids' in drag) setState({ draggingIds: drag.ids });
      }
      if (!drag.moved) return;
      const k = getState().view.k;
      const dx = dxs / k;
      const dy = dys / k;

      switch (drag.kind) {
        case 'pan': {
          const v = getState().view;
          setState({ view: { ...v, x: drag.vx + dxs, y: drag.vy + dys } });
          break;
        }
        case 'item':
        case 'group': {
          const { orig } = drag;
          updateBoard((b) => {
            for (const [id, o] of orig) {
              const obj = b.items[id] || b.groups[id];
              if (!obj) continue;
              obj.x = Math.round(o.x + dx);
              obj.y = Math.round(o.y + dy);
            }
          });
          if (drag.kind === 'item')
            setState({ dropTarget: findDropTarget(getState().board, drag.id, drag.ids) });
          break;
        }
        case 'clip': {
          const { id, orig } = drag;
          updateBoard((b) => {
            const c = b.clips[id];
            if (!c) return;
            c.x = Math.round(orig.x + dx);
            c.y = Math.round(orig.y + dy);
          });
          break;
        }
        case 'clip-resize': {
          // Scales around the center, keeping the proportions (works the same at any rotation).
          const { id, orig, c, d0 } = drag;
          const p = toWorld(e.clientX, e.clientY);
          const f = Math.max(CLIP_MIN / Math.min(orig.w, orig.h), Math.hypot(p.x - c.x, p.y - c.y) / d0);
          const w = orig.w * f;
          const h = orig.h * f;
          updateBoard((b) => {
            if (b.clips[id])
              Object.assign(b.clips[id], {
                w: Math.round(w),
                h: Math.round(h),
                x: Math.round(c.x - w / 2),
                y: Math.round(c.y - h / 2),
              });
          });
          break;
        }
        case 'clip-rotate': {
          const { id, orig, c, a0 } = drag;
          const p = toWorld(e.clientX, e.clientY);
          let rot = orig.rot + ((Math.atan2(p.y - c.y, p.x - c.x) - a0) * 180) / Math.PI;
          rot = ((rot % 360) + 360) % 360;
          // Snap to the straight angles when close, so a cut-out can be put back upright.
          const snap = Math.round(rot / 90) * 90;
          if (Math.abs(rot - snap) < 4) rot = snap % 360;
          updateBoard((b) => {
            if (b.clips[id]) b.clips[id].rot = Math.round(rot * 10) / 10;
          });
          break;
        }
        case 'resize': {
          const { id, ow, oh, limits } = drag;
          updateBoard((b) => {
            const g = b.groups[id];
            if (!g) return;
            Object.assign(g, clampRoomSize(g, ow + dx, oh + dy, limits));
          });
          break;
        }
        case 'draw': {
          const w = toWorld(e.clientX, e.clientY);
          drag.cx = w.x;
          drag.cy = w.y;
          setState({
            ghost: {
              x: Math.min(drag.wx, w.x),
              y: Math.min(drag.wy, w.y),
              w: Math.abs(w.x - drag.wx),
              h: Math.abs(w.y - drag.wy),
            },
          });
          break;
        }
      }
    }

    function finishDrag(cancelled: boolean, e?: PointerEvent) {
      if (!drag) return;
      const d = drag;
      drag = null;
      setState({ panning: false });
      if (d.kind === 'clip' || d.kind === 'clip-resize' || d.kind === 'clip-rotate') {
        if (d.moved && cancelled)
          updateBoard((b) => {
            if (b.clips[d.id]) b.clips[d.id] = d.orig;
          });
      } else if (d.kind === 'item' || d.kind === 'group' || d.kind === 'resize') {
        const target = getState().dropTarget;
        setState({ dropTarget: null, draggingIds: null });
        if (d.moved && cancelled) {
          // Interrupted (second finger, system gesture): put everything back where it started.
          updateBoard((b) => {
            if (d.kind === 'resize') {
              if (b.groups[d.id]) Object.assign(b.groups[d.id], { w: d.ow, h: d.oh });
              return;
            }
            for (const [id, o] of d.orig) {
              const obj = b.items[id] || b.groups[id];
              if (obj) Object.assign(obj, o);
            }
          });
        } else if (d.moved && d.kind === 'item') {
          if (target && !cancelled) joinStack(d.ids, target);
          else {
            let settled = false;
            updateBoard((b) => {
              assignRoom(b, d.ids, d.id);
              settled = settleCard(b, d.ids, d.id);
            });
            if (settled) animateLayout();
          }
        } else if (d.moved && (d.kind === 'group' || d.kind === 'resize')) {
          updateBoard((b) => adoptLooseCards(b, d.id));
        }
        if (!d.moved && !cancelled) {
          if (d.kind === 'item' && d.compare && stackOf(getState().board, d.id)) openCompare(d.id);
          else {
            if (d.kind === 'item' && d.back) bringFront(d.id);
            openDrawer(d.kind === 'item' ? 'item' : 'group', d.id);
          }
        }
      } else if (d.kind === 'pan') {
        const drawer = getState().drawer;
        if (!d.moved && !cancelled) {
          if (drawer && drawer.type !== 'summary') closeDrawer();
          if (getState().selectedClip) selectClip(null);
        }
      } else if (d.kind === 'draw') {
        setState({ ghost: null });
        if (!cancelled) {
          let x = Math.min(d.wx, d.cx);
          let y = Math.min(d.wy, d.cy);
          let w = Math.abs(d.cx - d.wx);
          let h = Math.abs(d.cy - d.wy);
          if (w < 120 || h < 100) {
            w = PAD * 2 + CARD_W * 2 + GAP;
            h = HEAD + PAD * 2 + CARD_H;
            x = d.wx - w / 2;
            y = d.wy - 20;
          }
          const id = createGroupAt(x, y, Math.max(w, CARD_W + PAD * 2), Math.max(h, HEAD + 90));
          setState({ tool: 'select', blank: true });
          openDrawer('group', id, 'gname');
        }
      } else if (d.kind === 'place' && !cancelled && e) {
        const w = toWorld(e.clientX, e.clientY);
        const id = createItemAt(w.x - CARD_W / 2, w.y - 30);
        setState({ tool: 'select', blank: true });
        openDrawer('item', id, 'name');
      }
    }

    function onEnd(e: PointerEvent) {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      if (drag?.kind === 'pinch') {
        if (pointers.size < 2) drag = null;
        return;
      }
      if (drag && e.pointerId === drag.pid) finishDrag(e.type === 'pointercancel', e);
    }

    function onDblClick(e: MouseEvent) {
      // Pointer capture retargets the click to the viewport, so look up what is really under the pointer.
      const target = document.elementFromPoint(e.clientX, e.clientY) || (e.target as Element);
      if (target.closest('.pill-btn,.stk,.clip,' + OVERLAYS)) return;
      // Double-clicking a card cuts its photo out instead of creating a new card.
      const card = target.closest<HTMLElement>('.tag');
      if (card) {
        if (getState().tool === 'select') void startClip(card.dataset.id!, toWorld(e.clientX, e.clientY));
        return;
      }
      if (target.closest('.room-head')) return;
      const w = toWorld(e.clientX, e.clientY);
      const id = createItemAt(w.x - CARD_W / 2, w.y - 30);
      setState({ blank: true });
      openDrawer('item', id, 'name');
    }

    // Right-clicking a card cuts its photo out, so the browser menu would only get in the way.
    function onContextMenu(e: MouseEvent) {
      if ((e.target as Element).closest('.tag,.clip') || getState().clipDraft) e.preventDefault();
    }

    function onWheel(e: WheelEvent) {
      // The inspector and the filter row (sideways on phones) scroll themselves.
      if ((e.target as Element).closest('.drawer,.fpanel')) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = vp!.getBoundingClientRect();
        zoomAt(e.clientX - r.left, e.clientY - r.top, getState().view.k * Math.exp(-e.deltaY * 0.01));
      } else panBy(e.deltaX, e.deltaY);
    }

    vp.addEventListener('pointerdown', onDown);
    vp.addEventListener('pointermove', onMove);
    vp.addEventListener('pointerup', onEnd);
    vp.addEventListener('pointercancel', onEnd);
    vp.addEventListener('dblclick', onDblClick);
    vp.addEventListener('contextmenu', onContextMenu);
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      vp.removeEventListener('pointerdown', onDown);
      vp.removeEventListener('pointermove', onMove);
      vp.removeEventListener('pointerup', onEnd);
      vp.removeEventListener('pointercancel', onEnd);
      vp.removeEventListener('dblclick', onDblClick);
      vp.removeEventListener('contextmenu', onContextMenu);
      vp.removeEventListener('wheel', onWheel);
    };
  }, [ref]);
}
