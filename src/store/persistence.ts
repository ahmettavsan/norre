import { STATUS } from '../domain/constants';
import { roomAt } from '../domain/geometry';
import type { Board, Item } from '../domain/types';

/*
 * Shape checks and migrations for saved boards, the board of someone using the app without an account
 * (kept in this browser), and small per-browser preferences. An account's board is saved by store/cloud.ts.
 */

/** Where this browser keeps the board without an account; the first key is written, both are read. */
const LOCAL_KEYS = ['norre-board-v1', 'yuvamiz-board-v1'];
const PREF_HIDE_UNMATCHED = 'norre-hide';

interface RawBoard {
  groups?: Board['groups'];
  items?: Board['items'];
  clips?: Board['clips'];
  meta?: Partial<Board['meta']>;
}

const isRawBoard = (d: unknown): d is RawBoard => !!d && typeof d === 'object';

/** Boards saved before these values were renamed (and the original app's seed data) use the Turkish ones. */
const RENAMED: Record<string, Record<string, string>> = {
  status: { alinacak: 'todo', bakiliyor: 'looking', alindi: 'bought' },
  delivery: { bekleniyor: 'pending', yolda: 'shipped', teslim: 'delivered' },
  priority: { acil: 'urgent', sonra: 'later' },
  payment: { pesin: 'full', taksit: 'installments' },
};

function migrateItem(it: Item): Item {
  const out: Record<string, unknown> = { ...it };
  for (const [field, renames] of Object.entries(RENAMED)) {
    const v = out[field];
    if (typeof v === 'string' && v in renames) out[field] = renames[v];
  }
  if (!(String(out.status) in STATUS)) out.status = 'todo';
  return out as unknown as Item;
}

/** A saved board in its current shape: renamed values converted, missing fields filled in. */
export function normalizeBoard(raw: unknown): Board {
  return toBoard(isRawBoard(raw) ? raw : {});
}

function toBoard(d: RawBoard): Board {
  const board: Board = {
    groups: { ...(d.groups || {}) },
    items: Object.fromEntries(Object.entries(d.items || {}).map(([id, it]) => [id, migrateItem(it)])),
    clips: { ...(d.clips || {}) },
    meta: { budget: 0, ...(d.meta || {}) },
  };
  // Older boards did not store a card's room: it was whichever room the card was drawn in.
  for (const it of Object.values(board.items))
    if (typeof it.room !== 'string') it.room = roomAt(board, it) || '';
  return board;
}

/** The board kept in this browser without an account, if any. */
export function takeLocalBoard(): Board | null {
  try {
    const raw = LOCAL_KEYS.map((k) => localStorage.getItem(k)).find(Boolean);
    return raw ? normalizeBoard(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

/** Keeps the board in this browser. False when it could not be written, usually because storage is full. */
export function writeLocalBoard(board: Board): boolean {
  try {
    localStorage.setItem(LOCAL_KEYS[0], JSON.stringify(board));
    return true;
  } catch {
    return false;
  }
}

/** Forgets the browser's board once it is safely in an account. */
export function clearLocalBoard(): void {
  try {
    for (const k of LOCAL_KEYS) localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

export function readPrefs(): { hideUnmatched: boolean } {
  try {
    return { hideUnmatched: localStorage.getItem(PREF_HIDE_UNMATCHED) === '1' };
  } catch {
    return { hideUnmatched: false };
  }
}

export function writeHideUnmatched(value: boolean): void {
  try {
    localStorage.setItem(PREF_HIDE_UNMATCHED, value ? '1' : '');
  } catch {
    /* ignore */
  }
}
