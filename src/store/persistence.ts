import { emptyBoard } from '../domain/board';
import { STATUS } from '../domain/constants';
import type { Board, Item } from '../domain/types';

/*
 * All browser storage lives here. To move the board to a backend (Firebase, Supabase…),
 * replace `loadInitialBoard` / `saveBoard` and keep the rest of the app untouched.
 */

const LS_KEY = 'norre-board-v1';
/** Where the board was saved while the app was called Yuvamız; read once if there is no new save. */
const OLD_LS_KEY = 'yuvamiz-board-v1';
const PREF_HIDE_UNMATCHED = 'norre-hide';

declare global {
  interface Window {
    /** Optional seed board injected by public/seed-board.js. */
    NORRE_SEED?: unknown;
  }
}

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

function toBoard(d: RawBoard): Board {
  return {
    groups: { ...(d.groups || {}) },
    items: Object.fromEntries(Object.entries(d.items || {}).map(([id, it]) => [id, migrateItem(it)])),
    clips: { ...(d.clips || {}) },
    meta: { budget: 0, ...(d.meta || {}) },
  };
}

/** Saved board from this browser, else the bundled seed (which is then saved), else an empty board. */
export function loadInitialBoard(): Board {
  try {
    const raw = localStorage.getItem(LS_KEY) ?? localStorage.getItem(OLD_LS_KEY);
    const d: unknown = raw ? JSON.parse(raw) : window.NORRE_SEED || null;
    if (!isRawBoard(d)) return emptyBoard();
    const board = toBoard(d);
    if (!raw) saveBoard(board);
    return board;
  } catch {
    return emptyBoard();
  }
}

export function saveBoard(board: Board): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(board));
  } catch {
    /* storage unavailable: keep in memory */
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pending: Board | null = null;

export function saveBoardSoon(board: Board): void {
  pending = board;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushBoardSave, 300);
}

export function flushBoardSave(): void {
  clearTimeout(saveTimer);
  if (pending) saveBoard(pending);
  pending = null;
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
