import * as B from '../domain/board';
import { CARD_H, CARD_W, DELIVERY_ORDER, STATUS_ORDER } from '../domain/constants';
import { freeSlot } from '../domain/geometry';
import { layoutSnapshot, restoreLayout, tidy, type LayoutSnapshot } from '../domain/layout';
import * as St from '../domain/stacks';
import { safeImg, uid } from '../domain/format';
import type { Board, Clip, Delivery, Filter, Group, Item, Priority, Status, Tool } from '../domain/types';
import { cutOut } from '../lib/cutout';
import { isImageFile, shrinkImage } from '../lib/image';
import { getState, setState, updateBoard, type DrawerType } from './appStore';
import { writeHideUnmatched } from './persistence';
import { fitAll, focusOn, pointerWorld } from './viewActions';

/* User-level operations. Components and gesture handlers call these; they never touch the board directly. */

/* ---------- UI ---------- */

let toastSeq = 0;
export function toast(msg: string, action?: { label: string; run: () => void }): void {
  setState({ toast: { msg, action, seq: ++toastSeq } });
}

let drawerSeq = 0;
export function openDrawer(type: DrawerType, id: string | null = null, focus?: string): void {
  setState({ drawer: { type, id, focus, seq: ++drawerSeq }, selectedClip: null });
}

export function closeDrawer(): void {
  setState({ drawer: null });
}

export function toggleSummary(): void {
  if (getState().drawer?.type === 'summary') closeDrawer();
  else openDrawer('summary');
}

export function setTool(tool: Tool): void {
  setState({ tool });
}

export function setFilter(filter: Filter): void {
  setState({ filter });
}

export function setHideUnmatched(v: boolean): void {
  setState({ hideUnmatched: v });
  writeHideUnmatched(v);
}

let animTimer: ReturnType<typeof setTimeout> | undefined;
/** Lets the next position changes slide into place instead of jumping. */
export function animateLayout(): void {
  setState({ animating: true });
  clearTimeout(animTimer);
  animTimer = setTimeout(() => setState({ animating: false }), 600);
}

/* ---------- creating ---------- */

export function createItemAt(x: number, y: number, extra?: Partial<Item>): string {
  let id = '';
  updateBoard((b) => {
    id = B.createItem(b, x, y, extra);
  });
  return id;
}

export function createItemInRoom(gid: string): void {
  let p = { x: 0, y: 0 };
  let id = '';
  updateBoard((b) => {
    p = freeSlot(b, gid);
    id = B.createItem(b, p.x, p.y);
  });
  openDrawer('item', id, 'name');
  focusOn(p.x, p.y, CARD_W, CARD_H);
}

export function createGroupAt(x: number, y: number, w: number, h: number): string {
  let id = '';
  updateBoard((b) => {
    id = B.createGroup(b, x, y, w, h);
  });
  return id;
}

/** The sample board carries its product photos, so it is only downloaded when asked for. */
export async function startFromTemplate(): Promise<void> {
  const { buildTemplate } = await import('../domain/template');
  updateBoard(buildTemplate);
  fitAll();
}

export function startBlank(): void {
  setState({ blank: true, tool: 'room' });
  toast('Panoda sürükleyerek ilk odanı çiz.');
}

/* ---------- editing cards ---------- */

export function updateItem(id: string, patch: Partial<Item>): void {
  updateBoard((b) => {
    if (b.items[id]) Object.assign(b.items[id], patch);
  });
}

export function setItemStatus(id: string, status: Status): void {
  updateBoard((b) => {
    const it = b.items[id];
    if (!it) return;
    it.status = status;
    if (status === 'bought' && !it.delivery) it.delivery = 'pending';
    if (status === 'bought') St.bringFront(b, id);
  });
}

export const setItemDelivery = (id: string, delivery: Delivery) => updateItem(id, { delivery });
export const setItemPriority = (id: string, priority: Priority) => updateItem(id, { priority });

/** Status pill on a card. Marking a card as bought opens the quick payment popover next to it. */
export function cycleStatus(id: string): void {
  const it = getState().board.items[id];
  if (!it) return;
  const next = STATUS_ORDER[(STATUS_ORDER.indexOf(it.status) + 1) % 3];
  setItemStatus(id, next);
  const { drawer, quickPay } = getState();
  if (next === 'bought' && !(drawer?.type === 'item' && drawer.id === id)) {
    // Bought just now, so today is the likeliest purchase date.
    if (!it.purchaseDate) updateItem(id, { purchaseDate: todayISO() });
    setState({ quickPay: id });
  } else if (quickPay === id) closeQuickPay();
}

export function closeQuickPay(): void {
  setState({ quickPay: null });
}

/** Shows every option of the card's stack side by side. Does nothing for a card without alternatives. */
export function openCompare(id: string): void {
  if (!St.stackOf(getState().board, id)) return;
  setState({ compare: id, quickPay: null });
}

export function closeCompare(): void {
  setState({ compare: null });
}

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function cycleDelivery(id: string): void {
  const it = getState().board.items[id];
  if (!it) return;
  const next = DELIVERY_ORDER[(DELIVERY_ORDER.indexOf(it.delivery || 'pending') + 1) % 3];
  setItemDelivery(id, next);
  if (next === 'delivered') toast(`${it.name} teslim edildi olarak işaretlendi.`);
}

export function moveItemToRoom(id: string, gid: string): void {
  updateBoard((b) => B.moveToRoom(b, id, gid));
  const it = getState().board.items[id];
  if (it) focusOn(it.x, it.y, CARD_W, CARD_H);
}

export function removeItem(id: string): void {
  updateBoard((b) => B.deleteItem(b, id));
}

export function deleteSelectedItem(id: string): void {
  removeItem(id);
  closeDrawer();
  toast('Eşya silindi.');
}

export async function attachPhoto(id: string, file: File): Promise<void> {
  if (!isImageFile(file)) return toast('Sadece görsel dosyaları eklenebilir.');
  setState({ uploading: id });
  try {
    if (!getState().board.items[id]) return;
    const img = await shrinkImage(file, 520, 0.8);
    updateItem(id, { img, imgId: '' });
  } catch {
    toast('Fotoğraf eklenemedi. Başka bir görselle tekrar dene.');
  } finally {
    setState({ uploading: null });
  }
}

export const removePhoto = (id: string) => updateItem(id, { img: '', imgId: '' });

/* ---------- alternatives (stacks) ---------- */

export function bringFront(id: string): void {
  updateBoard((b) => St.bringFront(b, id));
}

export function cycleStack(id: string, dir: 1 | -1): void {
  const { board, drawer } = getState();
  const st = St.stackOf(board, id);
  if (!st) return;
  updateBoard((b) => St.cycleStack(b, id, dir));
  if (drawer?.type === 'item' && drawer.id && st.ids.includes(drawer.id)) {
    const front = St.stackOf(getState().board, id)?.ids[0];
    if (front) openDrawer('item', front);
  }
}

let stackUndo: St.StackUndo | null = null;

export function joinStack(ids: Iterable<string>, targetId: string): void {
  let size = 0;
  updateBoard((b) => {
    const r = St.joinStack(b, ids, targetId);
    stackUndo = r.before;
    size = r.size;
  });
  toast(`Alternatif olarak eklendi. ${size} seçenek bir arada.`, { label: 'Geri al', run: undoStack });
}

function undoStack(): void {
  const before = stackUndo;
  if (!before) return;
  stackUndo = null;
  updateBoard((b) => {
    for (const [i, o] of before) if (b.items[i]) Object.assign(b.items[i], o);
  });
}

export function addAlternative(id: string): void {
  let nid: string | null = null;
  updateBoard((b) => {
    nid = B.addAlternative(b, id);
  });
  if (!nid) return;
  openDrawer('item', nid, 'name');
  toast('Yeni seçenek yığının önüne eklendi. Fotoğrafını ve fiyatını gir.');
}

export function detachFromStack(id: string): void {
  let done = false;
  updateBoard((b) => {
    done = B.detachFromStack(b, id);
  });
  if (!done) return;
  animateLayout();
  openDrawer('item', id);
  toast('Kart yığından çıkarıldı.');
}

/* ---------- photo cut-outs ---------- */

/** Longest side of a new cut-out on the board. */
const CLIP_SIZE = 220;
const CLIP_HINT = 'Küpürü bırakmak istediğin yere tıkla. Vazgeçmek için Esc.';

/** Cuts the card's photo out and lets it follow the pointer until it is dropped with a click. */
export async function startClip(id: string, at?: { x: number; y: number }): Promise<void> {
  const it = getState().board.items[id];
  if (!it) return;
  if (!safeImg(it.img)) return toast('Bu eşyanın fotoğrafı yok. Önce fotoğraf ekle.');
  closeDrawer();
  setState({ compare: null, quickPay: null, selectedClip: null });
  try {
    const cut = await cutOut(it.img);
    const k = CLIP_SIZE / Math.max(cut.w, cut.h);
    setState({
      clipDraft: { img: cut.img, w: Math.round(cut.w * k), h: Math.round(cut.h * k) },
      clipCursor: at || pointerWorld(),
    });
    toast(CLIP_HINT);
  } catch {
    toast('Fotoğraf kesilemedi.');
  }
}

/** Hides the "click to drop" hint once the cut-out is dropped or given up. */
const clearClipHint = () => {
  if (getState().toast?.msg === CLIP_HINT) setState({ toast: null });
};

export function cancelClip(): void {
  if (!getState().clipDraft) return;
  setState({ clipDraft: null, clipCursor: null });
  clearClipHint();
}

/** Drops the cut-out being placed, centered on a board point, on top of the others. */
export function placeClip(at: { x: number; y: number }): void {
  const draft = getState().clipDraft;
  if (!draft) return;
  const id = uid();
  updateBoard((b) => {
    b.clips[id] = {
      img: draft.img,
      x: Math.round(at.x - draft.w / 2),
      y: Math.round(at.y - draft.h / 2),
      w: draft.w,
      h: draft.h,
      rot: 0,
      z: topZ(b) + 1,
    };
  });
  setState({ clipDraft: null, clipCursor: null, selectedClip: id, blank: true });
  clearClipHint();
}

const topZ = (b: Board) => Math.max(0, ...Object.values(b.clips).map((c) => c.z));

export function selectClip(id: string | null): void {
  if (id) closeDrawer();
  setState({ selectedClip: id });
}

export function updateClip(id: string, patch: Partial<Clip>): void {
  updateBoard((b) => {
    if (b.clips[id]) Object.assign(b.clips[id], patch);
  });
}

export function clipToFront(id: string): void {
  updateBoard((b) => {
    if (b.clips[id]) b.clips[id].z = topZ(b) + 1;
  });
}

export function clipToBack(id: string): void {
  updateBoard((b) => {
    if (b.clips[id]) b.clips[id].z = Math.min(0, ...Object.values(b.clips).map((c) => c.z)) - 1;
  });
}

export function flipClip(id: string): void {
  const c = getState().board.clips[id];
  if (c) updateClip(id, { flip: !c.flip });
}

export function deleteClip(id: string): void {
  const c = getState().board.clips[id];
  if (!c) return;
  updateBoard((b) => {
    delete b.clips[id];
  });
  setState({ selectedClip: null });
  toast('Küpür silindi.', {
    label: 'Geri al',
    run: () =>
      updateBoard((b) => {
        b.clips[id] = c;
      }),
  });
}

/* ---------- rooms ---------- */

export function updateGroup(id: string, patch: Partial<Group>): void {
  updateBoard((b) => {
    if (b.groups[id]) Object.assign(b.groups[id], patch);
  });
}

export function removeGroup(id: string): void {
  updateBoard((b) => {
    delete b.groups[id];
  });
}

export function setBudget(budget: number): void {
  updateBoard((b) => {
    b.meta.budget = budget;
  });
}

/* ---------- whole board ---------- */

let tidyUndo: LayoutSnapshot | null = null;

export function tidyAll(): void {
  const { board } = getState();
  if (!Object.keys(board.groups).length && !Object.keys(board.items).length) {
    return toast('Panoda düzenlenecek kart yok.');
  }
  tidyUndo = layoutSnapshot(board);
  updateBoard(tidy);
  animateLayout();
  fitAll();
  toast('Kartlar düzenlendi.', { label: 'Geri al', run: undoTidy });
}

function undoTidy(): void {
  const snap = tidyUndo;
  if (!snap) return;
  tidyUndo = null;
  updateBoard((b) => restoreLayout(b, snap));
  animateLayout();
  fitAll();
}

/** Adds dropped image files as new cards around a board point (at most 8). */
export function addImageCards(files: File[], at: { x: number; y: number }): void {
  const images = files.filter(isImageFile).slice(0, 8);
  images.forEach((f, i) => {
    const name = f.name
      .replace(/\.[^.]+$/, '')
      .replace(/[-_]+/g, ' ')
      .trim();
    const id = createItemAt(at.x - CARD_W / 2 + i * 24, at.y - 40 + i * 24, {
      name: /^(img|image|photo|dsc|screenshot)/i.test(name) || !name ? 'Yeni eşya' : name.slice(0, 60),
    });
    if (i === images.length - 1) openDrawer('item', id, 'name');
    void attachPhoto(id, f);
  });
  if (images.length) setState({ blank: true });
}
