import type { Board, Item } from './types';

/*
 * Alternatives ("seçenekler") are cards sharing the same `stack` id. They sit on top of each other on
 * the board; `so` orders them, lowest first. A stack with a single member is not a stack.
 */

const so = (board: Board, id: string) => board.items[id].so || 0;

/** stack id → member ids ordered front to back. Only stacks with 2+ members. */
export function stackMap(board: Board): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const [id, it] of Object.entries(board.items)) {
    if (!it.stack) continue;
    const list = m.get(it.stack);
    if (list) list.push(id);
    else m.set(it.stack, [id]);
  }
  for (const [sid, ids] of m) {
    if (ids.length < 2) {
      m.delete(sid);
      continue;
    }
    ids.sort((a, b) => so(board, a) - so(board, b) || (a < b ? -1 : 1));
  }
  return m;
}

export function stackOf(board: Board, id: string): { sid: string; ids: string[] } | null {
  const it = board.items[id];
  if (!it || !it.stack) return null;
  const ids = stackMap(board).get(it.stack);
  return ids ? { sid: it.stack, ids } : null;
}

/**
 * One representative card per stack (the bought one, else the front one) plus every loose card.
 * Totals and counts are computed over these so alternatives are not counted twice.
 */
export function reps(board: Board): [string, Item][] {
  const sm = stackMap(board);
  const out: [string, Item][] = [];
  for (const [id, it] of Object.entries(board.items)) {
    if (!(it.stack && sm.has(it.stack))) out.push([id, it]);
  }
  for (const ids of sm.values()) {
    const b = ids.find((i) => board.items[i].status === 'bought') || ids[0];
    out.push([b, board.items[b]]);
  }
  return out;
}

export function bringFront(board: Board, id: string): void {
  const st = stackOf(board, id);
  if (!st || st.ids[0] === id) return;
  board.items[id].so = Math.min(...st.ids.map((i) => so(board, i))) - 1;
}

/** Rotates the stack. dir > 0 sends the front card to the back; dir < 0 brings the back card forward. */
export function cycleStack(board: Board, id: string, dir: 1 | -1): void {
  const st = stackOf(board, id);
  if (!st) return;
  const sos = st.ids.map((i) => so(board, i));
  if (dir > 0) board.items[st.ids[0]].so = Math.max(...sos) + 1;
  else board.items[st.ids[st.ids.length - 1]].so = Math.min(...sos) - 1;
}

export type StackUndo = Map<string, Pick<Item, 'x' | 'y' | 'stack' | 'so'>>;

/** Drops `ids` onto `targetId`'s stack. Returns the previous state of every touched card and the new size. */
export function joinStack(
  board: Board,
  ids: Iterable<string>,
  targetId: string,
): { before: StackUndo; size: number } {
  const sm = stackMap(board);
  const t = board.items[targetId];
  const sid = t.stack && sm.has(t.stack) ? t.stack : targetId;
  const members = sm.get(sid) || [targetId];
  const dragged = [...ids].filter((i) => board.items[i] && !members.includes(i));
  const before: StackUndo = new Map();
  for (const i of [...members, ...dragged]) {
    const it = board.items[i];
    before.set(i, { x: it.x, y: it.y, stack: it.stack || '', so: it.so || 0 });
  }
  let min = Math.min(...members.map((i) => so(board, i)));
  for (const i of members) board.items[i].stack = sid;
  dragged
    .sort((a, b) => so(board, b) - so(board, a))
    .forEach((i) => {
      const it = board.items[i];
      it.stack = sid;
      it.so = --min;
      it.x = t.x;
      it.y = t.y;
    });
  return { before, size: members.length + dragged.length };
}

/** Dissolves a stack that has only one card left. */
export function settleStack(board: Board, sid: string): void {
  const left = Object.values(board.items).filter((x) => x.stack === sid);
  if (left.length === 1) {
    left[0].stack = '';
    left[0].so = 0;
  }
}
