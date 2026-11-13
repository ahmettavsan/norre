import { CARD_H, CARD_W, GAP, HEAD, MIN_GAP, PAD, STACK_OFFSETS } from './constants';
import { stackMap, stackOf } from './stacks';
import type { Board, Clip, Item } from './types';

/*
 * Functions that take a `Board` and return nothing (or a flag) mutate it in place.
 * They are meant to run inside an Immer recipe (see `updateBoard` in store/appStore.ts).
 */

const anchorInside = (it: Pick<Item, 'x' | 'y'>, g: Board['groups'][string]): boolean => {
  const cx = it.x + CARD_W / 2;
  const cy = it.y + 40;
  return cx >= g.x && cx <= g.x + g.w && cy >= g.y && cy <= g.y + g.h;
};

/**
 * The smallest room under the card's anchor point, or null. This is only where the card is drawn;
 * which room it belongs to is `item.room`.
 */
export function roomAt(board: Board, it: Pick<Item, 'x' | 'y'>): string | null {
  let best: string | null = null;
  let area = Infinity;
  for (const [id, g] of Object.entries(board.groups)) {
    if (anchorInside(it, g)) {
      const a = g.w * g.h;
      if (a < area) {
        area = a;
        best = id;
      }
    }
  }
  return best;
}

/** The cards that belong to the room. */
export function membersOf(board: Board, gid: string): string[] {
  return Object.keys(board.items).filter((id) => board.items[id].room === gid);
}

/** The room a card belongs to, when that room still exists. */
export const roomOf = (board: Board, it: Pick<Item, 'room'>): string | null =>
  it.room && board.groups[it.room] ? it.room : null;

/** A card (or stack, `ids`) the user put down joins the room it was put in, or none. */
export function assignRoom(board: Board, ids: Iterable<string>, leadId: string): void {
  const lead = board.items[leadId];
  if (!lead) return;
  const gid = roomAt(board, lead) || '';
  for (const i of ids) if (board.items[i]) board.items[i].room = gid;
}

/**
 * Cards without a room that now lie inside the room join it (after the room was drawn, moved or grown
 * around them). Cards of another room are never taken.
 */
export function adoptLooseCards(board: Board, gid: string): void {
  const g = board.groups[gid];
  if (!g) return;
  for (const it of Object.values(board.items)) if (!roomOf(board, it) && anchorInside(it, g)) it.room = gid;
}

const columnsOf = (w: number) => Math.max(1, Math.floor((w - PAD * 2 + GAP) / (CARD_W + GAP)));

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where each card is drawn. Alternatives peek out behind their front card; hidden ones are left out. */
export function cardBoxes(board: Board): Map<string, Box> {
  const out = new Map<string, Box>();
  const sm = stackMap(board);
  for (const ids of sm.values()) {
    const f = board.items[ids[0]];
    ids.forEach((i, d) => {
      if (d > 2) return;
      const off = STACK_OFFSETS[d];
      out.set(i, { x: f.x + off, y: f.y - off, w: CARD_W, h: CARD_H });
    });
  }
  for (const [id, it] of Object.entries(board.items)) {
    if (!(it.stack && sm.has(it.stack))) {
      out.set(id, { x: it.x, y: it.y, w: CARD_W, h: CARD_H });
    }
  }
  return out;
}

/** True when the two boxes are at least `MIN_GAP` apart. */
const clear = (a: Box, b: Box) =>
  a.x >= b.x + b.w + MIN_GAP ||
  a.x + a.w + MIN_GAP <= b.x ||
  a.y >= b.y + b.h + MIN_GAP ||
  a.y + a.h + MIN_GAP <= b.y;

/**
 * First free grid slot in a room. Grows the room if the slot lies below its bottom edge.
 * `exceptId` is the card being placed; it and its alternatives do not count as obstacles.
 */
export function freeSlot(board: Board, gid: string, exceptId?: string): { x: number; y: number } {
  const g = board.groups[gid];
  const cols = columnsOf(g.w);
  const skip = new Set(exceptId ? stackOf(board, exceptId)?.ids || [exceptId] : []);
  const others = [...cardBoxes(board)].filter(([id]) => !skip.has(id)).map(([, b]) => b);
  for (let r = 0; r < 60; r++) {
    for (let c = 0; c < cols; c++) {
      const x = g.x + PAD + c * (CARD_W + GAP);
      const y = g.y + HEAD + PAD + r * (CARD_H + GAP);
      const slot = { x, y, w: CARD_W, h: CARD_H };
      if (others.every((o) => clear(slot, o))) {
        const need = y + CARD_H + PAD - g.y;
        if (need > g.h) g.h = need;
        return { x, y };
      }
    }
  }
  return { x: g.x + PAD, y: g.y + g.h };
}

/**
 * Puts a dropped or newly created card where it does not touch any other card: it keeps its spot when
 * that is already clear, otherwise it moves to the nearest position at least `MIN_GAP` away from every
 * other card. Inside a room it also stays clear of the title line and within the side walls, and the
 * room grows if the card pokes out the bottom. `ids` move together (a whole stack); `pid` is the lead
 * card. Returns true when the cards were moved.
 */
export function settleCard(board: Board, ids: Iterable<string>, pid: string): boolean {
  const it = board.items[pid];
  if (!it) return false;
  const moving = new Set(ids);
  const boxes = cardBoxes(board);

  // Footprint of the moving cards (a stack peeks out up and to the right), relative to the lead card.
  const parts = [...moving]
    .map((i) => boxes.get(i))
    .filter((b): b is Box => !!b)
    .map((b) => ({ dx: b.x - it.x, dy: b.y - it.y }));
  if (!parts.length) parts.push({ dx: 0, dy: 0 });
  const obstacles = [...boxes].filter(([i]) => !moving.has(i)).map(([, b]) => b);

  const gid = roomOf(board, it);
  const g = gid ? board.groups[gid] : null;
  const minX = g ? g.x + PAD : -Infinity;
  const maxX = g ? Math.max(minX, g.x + g.w - PAD - CARD_W) : Infinity;
  const minY = g ? g.y + HEAD + PAD : -Infinity;
  const want = { x: Math.round(Math.min(Math.max(it.x, minX), maxX)), y: Math.round(Math.max(it.y, minY)) };

  const fits = (x: number, y: number) =>
    parts.every((p) => {
      const box = { x: x + p.dx, y: y + p.dy, w: CARD_W, h: CARD_H };
      return obstacles.every((o) => clear(box, o));
    });

  let best = want;
  if (!fits(want.x, want.y)) {
    // The nearest clear spot lines up with an edge of some card (plus the gap) on at least one axis,
    // so those edges, the wanted position and the room walls are the only candidates worth testing.
    const xs = new Set([want.x]);
    const ys = new Set([want.y]);
    if (g) {
      xs.add(minX);
      xs.add(maxX);
      ys.add(minY);
    }
    for (const o of obstacles) {
      for (const p of parts) {
        xs.add(Math.ceil(o.x + o.w + MIN_GAP - p.dx));
        xs.add(Math.floor(o.x - CARD_W - MIN_GAP - p.dx));
        ys.add(Math.ceil(o.y + o.h + MIN_GAP - p.dy));
        ys.add(Math.floor(o.y - CARD_H - MIN_GAP - p.dy));
      }
    }
    const candidates: { x: number; y: number; d: number }[] = [];
    for (const x of xs) {
      if (x < minX || x > maxX) continue;
      for (const y of ys) {
        if (y < minY) continue;
        candidates.push({ x, y, d: Math.hypot(x - want.x, y - want.y) });
      }
    }
    candidates.sort((a, b) => a.d - b.d);
    best = candidates.find((c) => fits(c.x, c.y)) || want;
  }

  const dx = best.x - it.x;
  const dy = best.y - it.y;
  if (dx || dy) {
    for (const i of moving) {
      const o = board.items[i];
      if (o) {
        o.x += dx;
        o.y += dy;
      }
    }
  }
  if (g) {
    const need = best.y + CARD_H + PAD - g.y;
    if (need > g.h) g.h = Math.round(need);
  }
  return !!(dx || dy);
}

/**
 * The smallest size a room can be resized to (from its bottom-right corner) without dropping any of
 * its cards: every card that belongs to it keeps the usual padding to the walls. A card can only leave
 * a room by being deleted or dragged out, never because the room shrank.
 */
export function roomMinSize(board: Board, gid: string): { w: number; h: number } {
  const g = board.groups[gid];
  let w = CARD_W + PAD * 2;
  let h = HEAD + 90;
  if (!g) return { w, h };
  const boxes = cardBoxes(board);
  for (const [id, it] of Object.entries(board.items)) {
    const b = boxes.get(id);
    if (!b || it.room !== gid) continue;
    // A card that already pokes out (older boards) must not make the room jump bigger.
    w = Math.max(w, Math.min(b.x + b.w + PAD - g.x, g.w));
    h = Math.max(h, Math.min(b.y + b.h + PAD - g.y, g.h));
  }
  return { w: Math.ceil(w), h: Math.ceil(h) };
}

export interface ResizeLimits {
  min: { w: number; h: number };
  /** Other rooms the resized room must not grow into, with the gap to keep from each. */
  blockers: (Box & { gapX: number; gapY: number; right: boolean; below: boolean })[];
}

const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** What a room may be resized to, computed once when the resize starts. */
export function resizeLimits(board: Board, gid: string): ResizeLimits {
  const g = board.groups[gid];
  const blockers: ResizeLimits['blockers'] = [];
  for (const [id, o] of Object.entries(board.groups)) {
    // Rooms that already overlap (older boards) are left alone rather than locking the resize.
    if (id === gid || overlaps(g, o)) continue;
    const right = o.x >= g.x + g.w;
    const below = o.y >= g.y + g.h;
    blockers.push({
      ...o,
      right,
      below,
      gapX: right ? Math.min(MIN_GAP, o.x - (g.x + g.w)) : 0,
      gapY: below ? Math.min(MIN_GAP, o.y - (g.y + g.h)) : 0,
    });
  }
  return { min: roomMinSize(board, gid), blockers };
}

/**
 * Size for a room being resized from its bottom-right corner: never smaller than its cards need and
 * never grown into another room (it stops at that room's edge instead).
 */
export function clampRoomSize(
  g: { x: number; y: number },
  w: number,
  h: number,
  { min, blockers }: ResizeLimits,
): { w: number; h: number } {
  w = Math.max(min.w, w);
  h = Math.max(min.h, h);
  for (let pass = 0; pass < 2; pass++) {
    for (const b of blockers) {
      if (!overlaps({ x: g.x, y: g.y, w, h }, b)) continue;
      const wFix = b.right ? b.x - b.gapX - g.x : -1;
      const hFix = b.below ? b.y - b.gapY - g.y : -1;
      const wOk = wFix >= min.w;
      const hOk = hFix >= min.h;
      // Give up as little of the requested size as possible.
      if (wOk && (!hOk || w - wFix <= h - hFix)) w = wFix;
      else if (hOk) h = hFix;
    }
  }
  return { w: Math.round(w), h: Math.round(h) };
}

/** Axis-aligned box around a (possibly rotated) clip. */
export function clipBounds(c: Clip): Bounds {
  const a = (c.rot * Math.PI) / 180;
  const hw = (Math.abs(c.w * Math.cos(a)) + Math.abs(c.h * Math.sin(a))) / 2;
  const hh = (Math.abs(c.w * Math.sin(a)) + Math.abs(c.h * Math.cos(a))) / 2;
  const cx = c.x + c.w / 2;
  const cy = c.y + c.h / 2;
  return { x1: cx - hw, y1: cy - hh, x2: cx + hw, y2: cy + hh };
}

export interface Bounds {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export function bounds(board: Board): Bounds | null {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const g of Object.values(board.groups)) {
    x1 = Math.min(x1, g.x);
    y1 = Math.min(y1, g.y);
    x2 = Math.max(x2, g.x + g.w);
    y2 = Math.max(y2, g.y + g.h);
  }
  for (const it of Object.values(board.items)) {
    x1 = Math.min(x1, it.x);
    y1 = Math.min(y1, it.y);
    x2 = Math.max(x2, it.x + CARD_W);
    y2 = Math.max(y2, it.y + CARD_H);
  }
  for (const c of Object.values(board.clips)) {
    const b = clipBounds(c);
    x1 = Math.min(x1, b.x1);
    y1 = Math.min(y1, b.y1);
    x2 = Math.max(x2, b.x2);
    y2 = Math.max(y2, b.y2);
  }
  return isFinite(x1) ? { x1, y1, x2, y2 } : null;
}
