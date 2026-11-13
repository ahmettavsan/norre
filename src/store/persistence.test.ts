import { beforeEach, describe, expect, it } from 'vitest';
import { clearLocalBoard, normalizeBoard, takeLocalBoard } from './persistence';

describe('saved boards', () => {
  it('converts the Turkish values of older boards', () => {
    const board = normalizeBoard({
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
    expect(normalizeBoard({ groups: {}, items: { a: { name: 'x' } } }).items.a.status).toBe('todo');
  });

  it('links the cards of older boards to the room they are drawn in', () => {
    const board = normalizeBoard({
      groups: { r: { name: 'Salon', color: '#f00', x: 0, y: 0, w: 600, h: 400 } },
      items: { a: { name: 'Koltuk', x: 20, y: 120 }, b: { name: 'Halı', x: 900, y: 0 } },
    });
    expect(board.items.a.room).toBe('r');
    expect(board.items.b.room).toBe('');
  });

  it('fills in what older boards are missing', () => {
    const board = normalizeBoard({ items: {} });
    expect(board.clips).toEqual({});
    expect(board.groups).toEqual({});
    expect(board.meta.budget).toBe(0);
    expect(normalizeBoard(null).items).toEqual({});
  });
});

describe('the board this browser kept before accounts', () => {
  beforeEach(() => localStorage.clear());

  it('is found under the old Yuvamız key too, and can be forgotten', () => {
    expect(takeLocalBoard()).toBeNull();
    localStorage.setItem(
      'yuvamiz-board-v1',
      JSON.stringify({ groups: {}, items: { a: { name: 'Koltuk' } } }),
    );
    expect(takeLocalBoard()!.items.a.name).toBe('Koltuk');
    clearLocalBoard();
    expect(takeLocalBoard()).toBeNull();
  });
});
