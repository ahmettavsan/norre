import { beforeEach, describe, expect, it } from 'vitest';
import { loadInitialBoard } from './persistence';

const KEY = 'norre-board-v1';
const loadSaved = (data: unknown) => {
  localStorage.setItem(KEY, JSON.stringify(data));
  return loadInitialBoard();
};

describe('saved boards', () => {
  beforeEach(() => localStorage.clear());

  it('converts the Turkish values of older boards', () => {
    const board = loadSaved({
      groups: {},
      items: {
        a: { name: 'Koltuk', status: 'alindi', delivery: 'yolda', priority: 'acil', payment: 'taksit' },
        b: { name: 'Halı', status: 'bakiliyor', delivery: '', priority: 'sonra' },
        c: { name: 'Masa', status: 'alinacak', delivery: 'teslim', payment: 'pesin' },
      },
      meta: { budget: 1000 },
    });
    expect(Object.keys(board.items)).toEqual(['a', 'b', 'c']);
    expect(board.items.a).toMatchObject({
      status: 'bought',
      delivery: 'shipped',
      priority: 'urgent',
      payment: 'installments',
    });
    expect(board.items.b).toMatchObject({ status: 'looking', delivery: '', priority: 'later' });
    expect(board.items.c).toMatchObject({ status: 'todo', delivery: 'delivered', payment: 'full' });
    expect(board.meta.budget).toBe(1000);
  });

  it('treats an unknown status as not bought yet', () => {
    expect(loadSaved({ groups: {}, items: { a: { name: 'x' } } }).items.a.status).toBe('todo');
  });

  it('still finds a board saved under the old Yuvamız key', () => {
    localStorage.setItem(
      'yuvamiz-board-v1',
      JSON.stringify({ groups: {}, items: { a: { name: 'Koltuk' } } }),
    );
    expect(loadInitialBoard().items.a.name).toBe('Koltuk');
  });

  it('links the cards of older boards to the room they are drawn in', () => {
    const board = loadSaved({
      groups: { r: { name: 'Salon', color: '#f00', x: 0, y: 0, w: 600, h: 400 } },
      items: { a: { name: 'Koltuk', x: 20, y: 120 }, b: { name: 'Halı', x: 900, y: 0 } },
    });
    expect(board.items.a.room).toBe('r');
    expect(board.items.b.room).toBe('');
  });

  it('loads boards saved before cut-outs existed', () => {
    expect(loadSaved({ groups: {}, items: {} }).clips).toEqual({});
  });
});
