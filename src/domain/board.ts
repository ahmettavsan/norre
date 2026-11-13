import { CARD_W, CHIPS, GAP } from './constants';
import { uid } from './format';
import { bounds, freeSlot, roomOf, settleCard } from './geometry';
import { settleStack, stackOf } from './stacks';
import type { Board, Item } from './types';

/* Board mutations. Every function mutates `board` in place and is meant to run inside an Immer recipe. */

export const emptyBoard = (): Board => ({ groups: {}, items: {}, clips: {}, meta: { budget: 0 } });

export function createItem(board: Board, x: number, y: number, extra: Partial<Item> = {}): string {
  const id = uid();
  board.items[id] = {
    name: 'Yeni eşya',
    price: 0,
    qty: 1,
    store: '',
    link: '',
    note: '',
    priority: 'normal',
    status: 'todo',
    delivery: '',
    deliveryDate: '',
    x: Math.round(x),
    y: Math.round(y),
    createdAt: Date.now(),
    ...extra,
  };
  // A new alternative shares its stack's spot on purpose; every other new card gets a clear spot.
  if (!extra.stack) settleCard(board, [id], id);
  return id;
}

export function createGroup(
  board: Board,
  x: number,
  y: number,
  w: number,
  h: number,
  name?: string,
  color?: string,
): string {
  const id = uid();
  const used = new Set(Object.values(board.groups).map((g) => g.color));
  board.groups[id] = {
    name: name || 'Yeni oda',
    color: color || CHIPS.find((c) => !used.has(c)) || CHIPS[Object.keys(board.groups).length % CHIPS.length],
    x: Math.round(x),
    y: Math.round(y),
    w: Math.round(w),
    h: Math.round(h),
  };
  return id;
}

export function deleteItem(board: Board, id: string): void {
  const it = board.items[id];
  delete board.items[id];
  if (it?.stack) settleStack(board, it.stack);
}

/** Adds an empty alternative in front of the card's stack (creating the stack if needed). */
export function addAlternative(board: Board, id: string): string | null {
  const it = board.items[id];
  if (!it) return null;
  const st = stackOf(board, id);
  const sid = st ? st.sid : id;
  if (!st) {
    it.stack = sid;
    it.so = 0;
  }
  const min = Math.min(...(st ? st.ids : [id]).map((i) => board.items[i].so || 0));
  return createItem(board, it.x, it.y, {
    name: it.name,
    priority: it.priority || 'normal',
    qty: it.qty || 1,
    stack: sid,
    so: min - 1,
  });
}

/** Takes a card out of its stack and puts it in the next free slot of its room (or beside it). */
export function detachFromStack(board: Board, id: string): boolean {
  const it = board.items[id];
  if (!it || !it.stack) return false;
  const sid = it.stack;
  it.stack = '';
  it.so = 0;
  const room = roomOf(board, it);
  const p = room ? freeSlot(board, room, id) : { x: it.x + CARD_W + GAP + 60, y: it.y };
  it.x = p.x;
  it.y = p.y;
  settleStack(board, sid);
  return true;
}

/** Moves a card (with its alternatives) into a room's free slot, or to the right of everything when `gid` is empty. */
export function moveToRoom(board: Board, id: string, gid: string): void {
  if (!board.items[id]) return;
  let p: { x: number; y: number };
  if (gid) p = freeSlot(board, gid, id);
  else {
    const b = bounds(board);
    p = { x: (b ? b.x2 : 0) + 60, y: b ? b.y1 : 0 };
  }
  // Alternatives move together, otherwise the stack would be split between two rooms.
  for (const i of stackOf(board, id)?.ids || [id]) {
    board.items[i].x = p.x;
    board.items[i].y = p.y;
  }
}
