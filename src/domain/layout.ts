import { CARD_H, CARD_W, GAP, HEAD, PAD } from './constants';
import { roomOf } from './geometry';
import { stackMap } from './stacks';
import type { Board } from './types';

/** Positions and sizes only; used to undo a layout change. */
export interface LayoutSnapshot {
  g: Map<string, { x: number; y: number; w: number; h: number }>;
  i: Map<string, { x: number; y: number }>;
}

export function layoutSnapshot(board: Board): LayoutSnapshot {
  return {
    g: new Map(Object.entries(board.groups).map(([id, g]) => [id, { x: g.x, y: g.y, w: g.w, h: g.h }])),
    i: new Map(Object.entries(board.items).map(([id, it]) => [id, { x: it.x, y: it.y }])),
  };
}

export function restoreLayout(board: Board, snap: LayoutSnapshot): void {
  for (const [id, o] of snap.g) if (board.groups[id]) Object.assign(board.groups[id], o);
  for (const [id, o] of snap.i) if (board.items[id]) Object.assign(board.items[id], o);
}

/** Lays rooms out in columns, cards in a 3-wide grid inside each room, loose cards to the right. */
export function tidy(board: Board): void {
  const members = new Map<string, string[]>(Object.keys(board.groups).map((id) => [id, []]));
  const loose: string[] = [];
  const sm = stackMap(board);
  for (const [id, it] of Object.entries(board.items)) {
    if (it.stack && sm.has(it.stack) && sm.get(it.stack)![0] !== id) continue;
    const r = roomOf(board, it);
    (r ? members.get(r)! : loose).push(id);
  }
  const byPos = (a: { x: number; y: number }, b: { x: number; y: number }) => a.y - b.y || a.x - b.x;
  const sortItems = (ids: string[]) => ids.sort((a, b) => byPos(board.items[a], board.items[b]));
  const rooms = Object.entries(board.groups).sort((a, b) => byPos(a[1], b[1]));
  const COLS_IN = 3;
  const ROOM_GAP = 72;
  const roomW = PAD * 2 + COLS_IN * CARD_W + (COLS_IN - 1) * GAP;
  const nCols = rooms.length <= 1 ? 1 : rooms.length <= 4 ? 2 : 3;
  const colY = new Array<number>(nCols).fill(0);
  for (const [gid, g] of rooms) {
    const ids = sortItems(members.get(gid)!);
    const rows = Math.max(1, Math.ceil(ids.length / COLS_IN));
    const h = HEAD + PAD * 2 + rows * CARD_H + (rows - 1) * GAP;
    let c = 0;
    for (let k = 1; k < nCols; k++) if (colY[k] < colY[c]) c = k;
    g.x = c * (roomW + ROOM_GAP);
    g.y = colY[c];
    g.w = roomW;
    g.h = h;
    ids.forEach((id, j) => {
      const it = board.items[id];
      it.x = g.x + PAD + (j % COLS_IN) * (CARD_W + GAP);
      it.y = g.y + HEAD + PAD + Math.floor(j / COLS_IN) * (CARD_H + GAP);
    });
    colY[c] += h + ROOM_GAP;
  }
  if (loose.length) {
    sortItems(loose);
    const x0 = rooms.length ? nCols * (roomW + ROOM_GAP) : 0;
    const cols = rooms.length ? 2 : Math.max(3, Math.ceil(Math.sqrt(loose.length)));
    const y0 = rooms.length ? HEAD + PAD : 0;
    loose.forEach((id, j) => {
      const it = board.items[id];
      it.x = x0 + (j % cols) * (CARD_W + GAP);
      it.y = y0 + Math.floor(j / cols) * (CARD_H + GAP);
    });
  }
  for (const ids of sm.values()) {
    const f = board.items[ids[0]];
    for (const i of ids) {
      board.items[i].x = f.x;
      board.items[i].y = f.y;
    }
  }
}
