import { produce } from 'immer';
import { create } from 'zustand';
import type { Board, Filter, Rect, Tool, View } from '../domain/types';
import { emptyBoard } from '../domain/board';
import { readPrefs } from './persistence';

export type DrawerType = 'item' | 'group' | 'summary';

export interface DrawerState {
  type: DrawerType;
  id: string | null;
  /** `data-f` of the field to focus when the drawer opens. */
  focus?: string;
  /** Bumped on every open so the drawer content remounts, like the original rebuild. */
  seq: number;
}

export interface ToastState {
  msg: string;
  action?: { label: string; run: () => void };
  seq: number;
}

export interface User {
  id: string;
  email: string;
}

export interface AppState {
  /** 'loading' until Supabase has told us whether someone is signed in. */
  authStatus: 'loading' | 'signedOut' | 'signedIn';
  user: User | null;
  /** The user came back from a password reset email and has to choose a new password. */
  recovery: boolean;
  /** The signed-in user's board: being fetched, on screen, or failed to load. */
  boardStatus: 'idle' | 'loading' | 'ready' | 'error';
  saveStatus: 'saved' | 'saving' | 'error';
  board: Board;
  view: View;
  tool: Tool;
  filter: Filter;
  hideUnmatched: boolean;
  drawer: DrawerState | null;
  /** The user dismissed the empty state (started blank or added something). */
  blank: boolean;
  /** Card under the dragged card, which would receive it as an alternative. */
  dropTarget: string | null;
  /** Ids being dragged (only once the pointer actually moved). */
  draggingIds: ReadonlySet<string> | null;
  /** Room outline while drawing a room, in world coordinates. */
  ghost: Rect | null;
  panning: boolean;
  spacePan: boolean;
  /** Animate card/room position changes (tidy, undo, detach). */
  animating: boolean;
  uploading: string | null;
  /** Card showing the quick payment popover (opened when a card is marked as bought). */
  quickPay: string | null;
  /** A card of the stack whose options are shown side by side. */
  compare: string | null;
  /** Photo cut-out following the pointer until it is dropped on the board (size in board units). */
  clipDraft: { img: string; w: number; h: number } | null;
  /** Board point under the pointer while a cut-out is being placed. */
  clipCursor: { x: number; y: number } | null;
  selectedClip: string | null;
  toast: ToastState | null;
}

const prefs = readPrefs();

export const useAppStore = create<AppState>()(() => ({
  authStatus: 'loading',
  user: null,
  recovery: false,
  boardStatus: 'idle',
  saveStatus: 'saved',
  board: emptyBoard(),
  view: { x: 40, y: 40, k: 1 },
  tool: 'select',
  filter: 'all',
  hideUnmatched: prefs.hideUnmatched,
  drawer: null,
  blank: false,
  dropTarget: null,
  draggingIds: null,
  ghost: null,
  panning: false,
  spacePan: false,
  animating: false,
  uploading: null,
  quickPay: null,
  compare: null,
  clipDraft: null,
  clipCursor: null,
  selectedClip: null,
  toast: null,
}));

export const getState = useAppStore.getState;
export const setState = useAppStore.setState;

/**
 * The single way to change board data. Runs `recipe` with Immer and stamps `updatedAt`
 * on every card it touched.
 */
export function updateBoard(recipe: (board: Board) => void): void {
  const prev = getState().board;
  let next = produce(prev, recipe);
  if (next === prev) return;
  const changed = Object.keys(next.items).filter((id) => next.items[id] !== prev.items[id]);
  if (changed.length) {
    const now = Date.now();
    next = produce(next, (d) => {
      for (const id of changed) d.items[id].updatedAt = now;
    });
  }
  setState({ board: next });
}

/** Selected item or room: whatever the inspector shows. */
export const selectedId = (s: AppState): string | null =>
  s.drawer && (s.drawer.type === 'item' || s.drawer.type === 'group') ? s.drawer.id : null;
