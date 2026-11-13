import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyBoard } from '../domain/board';
import { getState, setState, updateBoard } from './appStore';
import { redo, undo } from './history';

const setBudget = (n: number) =>
  updateBoard((b) => {
    b.meta.budget = n;
  });
const budget = () => getState().board.meta.budget;

describe('undo and redo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Loading a board starts a fresh history.
    setState({ boardStatus: 'loading' });
    setState({ board: emptyBoard() });
    setState({ boardStatus: 'ready' });
  });
  afterEach(() => vi.useRealTimers());

  it('takes back a change and puts it back again', () => {
    setBudget(100);
    vi.advanceTimersByTime(1000);
    setBudget(200);
    undo();
    expect(budget()).toBe(100);
    undo();
    expect(budget()).toBe(0);
    undo();
    expect(budget()).toBe(0);
    redo();
    redo();
    expect(budget()).toBe(200);
  });

  it('treats changes in quick succession as one step', () => {
    setBudget(1);
    setBudget(12);
    setBudget(120);
    undo();
    expect(budget()).toBe(0);
  });

  it('keeps a whole drag as one step, however long the pointer is held', () => {
    window.dispatchEvent(new Event('pointerdown'));
    setBudget(1);
    vi.advanceTimersByTime(3000);
    setBudget(2);
    window.dispatchEvent(new Event('pointerup'));
    vi.advanceTimersByTime(1000);
    setBudget(3);
    undo();
    expect(budget()).toBe(2);
    undo();
    expect(budget()).toBe(0);
  });

  it('forgets what could be redone once something new changes', () => {
    setBudget(100);
    undo();
    setBudget(5);
    redo();
    expect(budget()).toBe(5);
  });

  it('starts over when another board is loaded', () => {
    setBudget(100);
    setState({ boardStatus: 'loading' });
    setState({ board: { ...emptyBoard(), meta: { budget: 50 } }, boardStatus: 'ready' });
    undo();
    expect(budget()).toBe(50);
  });
});
