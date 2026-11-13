import type { Board } from '../domain/types';
import { animateLayout } from './actions';
import { getState, setState, useAppStore } from './appStore';

/*
 * Undo and redo (⌘Z / Ctrl+Z, ⇧⌘Z / Ctrl+Y) for every change to the board. Boards are immutable, so a
 * step is simply the board as it was before. Changes that come in quick succession, like the moves of
 * one drag or the letters of one word, form a single step.
 */

const LIMIT = 100;
/** A step ends once the board has been still for this long (and no pointer is down). */
const QUIET = 800;

let past: Board[] = [];
let future: Board[] = [];
/** The current change still belongs to the last step. */
let open = false;
let pointerDown = false;
let quietTimer: ReturnType<typeof setTimeout> | undefined;
/** Set while undo/redo itself puts a board on screen. */
let applying = false;

function closeStepSoon(): void {
  clearTimeout(quietTimer);
  if (!pointerDown) quietTimer = setTimeout(() => (open = false), QUIET);
}

useAppStore.subscribe((s, prev) => {
  if (s.board === prev.board || applying) return;
  // A board that was loaded or replaced (sign-in, sign-out) starts a fresh history.
  if (s.boardStatus !== 'ready' || prev.boardStatus !== 'ready' || s.user?.id !== prev.user?.id) {
    past = [];
    future = [];
    open = false;
    return;
  }
  if (!open) {
    past.push(prev.board);
    if (past.length > LIMIT) past.shift();
    future = [];
    open = true;
  }
  closeStepSoon();
});

if (typeof window !== 'undefined') {
  // Each press starts a new step; the step stays open until the pointer is up and the board is still.
  window.addEventListener(
    'pointerdown',
    () => {
      pointerDown = true;
      open = false;
    },
    true,
  );
  const up = () => {
    pointerDown = false;
    if (open) closeStepSoon();
  };
  window.addEventListener('pointerup', up, true);
  window.addEventListener('pointercancel', up, true);
}

function show(board: Board): void {
  applying = true;
  setState({ board });
  applying = false;
  open = false;
  // Let go of anything that pointed at something which is no longer there.
  const { quickPay, compare, selectedClip } = getState();
  if (quickPay && !board.items[quickPay]) setState({ quickPay: null });
  if (compare && !board.items[compare]) setState({ compare: null });
  if (selectedClip && !board.clips[selectedClip]) setState({ selectedClip: null });
  animateLayout();
}

export function undo(): void {
  const board = past.pop();
  if (!board) return;
  future.push(getState().board);
  show(board);
}

export function redo(): void {
  const board = future.pop();
  if (!board) return;
  past.push(getState().board);
  show(board);
}
