import { membersOf, roomOf } from './geometry';
import { reps } from './stacks';
import { total } from './format';
import type { Board, Filter, Group, Item } from './types';

export function matches(it: Item, filter: Filter): boolean {
  switch (filter) {
    case 'todo':
      return it.status === 'todo';
    case 'looking':
      return it.status === 'looking';
    case 'bought':
      return it.status === 'bought';
    case 'awaiting':
      return it.status === 'bought' && it.delivery !== 'delivered';
    case 'delivered':
      return it.status === 'bought' && it.delivery === 'delivered';
    default:
      return true;
  }
}

export interface RoomStat {
  n: number;
  done: number;
  sum: number;
}

export interface BoardStats {
  /** Per room, using the smallest containing room for each card. */
  rooms: Map<string, RoomStat>;
  spent: number;
  planned: number;
  counts: Record<Filter, number>;
}

export function boardStats(board: Board): BoardStats {
  const rooms = new Map<string, RoomStat>();
  for (const id of Object.keys(board.groups)) rooms.set(id, { n: 0, done: 0, sum: 0 });
  let spent = 0;
  let planned = 0;
  const counts: Record<Filter, number> = {
    all: 0,
    todo: 0,
    looking: 0,
    bought: 0,
    awaiting: 0,
    delivered: 0,
  };
  for (const [, it] of reps(board)) {
    const t = total(it);
    planned += t;
    if (it.status === 'bought') spent += t;
    const r = roomOf(board, it);
    if (r) {
      const s = rooms.get(r)!;
      s.n++;
      s.sum += t;
      if (it.status === 'bought') s.done++;
    }
    counts.all++;
    if (it.status === 'todo') counts.todo++;
    else if (it.status === 'looking') counts.looking++;
    else {
      counts.bought++;
      if (it.delivery === 'delivered') counts.delivered++;
      else counts.awaiting++;
    }
  }
  return { rooms, spent, planned, counts };
}

export interface RoomSummary {
  id: string;
  g: Group;
  n: number;
  done: number;
  sum: number;
  spent: number;
}

/** Summary panel rows, one per room, counting the cards that belong to it. */
export function roomSummaries(board: Board): RoomSummary[] {
  const repSet = new Set(reps(board).map((r) => r[0]));
  return Object.entries(board.groups).map(([id, g]) => {
    const ids = membersOf(board, id).filter((i) => repSet.has(i));
    let n = 0;
    let done = 0;
    let sum = 0;
    let spent = 0;
    for (const i of ids) {
      const it = board.items[i];
      n++;
      sum += total(it);
      if (it.status === 'bought') {
        done++;
        spent += total(it);
      }
    }
    return { id, g, n, done, sum, spent };
  });
}
