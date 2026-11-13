import { produce } from 'immer';
import { describe, expect, it } from 'vitest';
import {
  addAlternative,
  createGroup,
  createItem,
  deleteGroup,
  deleteItem,
  detachFromStack,
  emptyBoard,
  moveToRoom,
} from './board';
import { CARD_H, CARD_W, GAP, HEAD, MIN_GAP, PAD } from './constants';
import { parseNum, total } from './format';
import {
  adoptLooseCards,
  assignRoom,
  bounds,
  cardBoxes,
  clampRoomSize,
  clipBounds,
  freeSlot,
  membersOf,
  resizeLimits,
  roomAt,
  roomMinSize,
  roomOf,
  settleCard,
} from './geometry';
import { layoutSnapshot, restoreLayout, tidy } from './layout';
import { buildTemplate } from './template';
import { bringFront, cycleStack, joinStack, reps, stackMap } from './stacks';
import { boardStats, matches } from './stats';
import type { Board } from './types';

const boardWith = (fn: (b: Board) => void) => produce(emptyBoard(), fn);

describe('format', () => {
  it('parses Turkish formatted numbers', () => {
    expect(parseNum('1.500')).toBe(1500);
    expect(parseNum('1.500,50')).toBe(1500.5);
    expect(parseNum('₺ 32.000')).toBe(32000);
    expect(parseNum('')).toBe(0);
  });

  it('multiplies price by quantity, treating a missing quantity as 1', () => {
    expect(total({ price: 1750, qty: 4 })).toBe(7000);
    expect(total({ price: 100, qty: 0 })).toBe(100);
  });
});

describe('geometry', () => {
  it('assigns a card to the smallest room containing it', () => {
    let small = '';
    const b = boardWith((d) => {
      createGroup(d, 0, 0, 2000, 2000, 'Ev');
      small = createGroup(d, 100, 100, 600, 400, 'Salon');
    });
    expect(roomAt(b, { x: 150, y: 250 })).toBe(small);
    expect(roomAt(b, { x: 5000, y: 5000 })).toBeNull();
  });

  it('pushes a card dropped on the room title below the header', () => {
    let id = '';
    const b = boardWith((d) => {
      createGroup(d, 0, 0, 632, 312);
      id = createItem(d, 40, 10);
    });
    expect(b.items[id].y).toBe(HEAD + PAD);
  });

  it('grows the room when the next free slot is below it', () => {
    let gid = '';
    const b = boardWith((d) => {
      gid = createGroup(d, 0, 0, PAD * 2 + CARD_W, HEAD + 90);
      freeSlot(d, gid);
    });
    expect(b.groups[gid].h).toBeGreaterThan(HEAD + 90);
  });

  it('moves a card dropped onto another one to the nearest spot with a gap', () => {
    let a = '';
    let c = '';
    const b = boardWith((d) => {
      createGroup(d, 0, 0, 700, 400);
      a = createItem(d, PAD, HEAD + PAD);
      c = createItem(d, 400, HEAD + PAD);
      // dropped onto `a`, partly over the room title, leaning towards the next column
      d.items[c].x = PAD + 60;
      d.items[c].y = HEAD;
      settleCard(d, [c], c);
    });
    expect(b.items[c]).toMatchObject({ x: PAD + CARD_W + MIN_GAP, y: HEAD + PAD });
    expect(b.items[a]).toMatchObject({ x: PAD, y: HEAD + PAD });
  });

  it('keeps cards apart outside rooms too', () => {
    let a = '';
    let c = '';
    const b = boardWith((d) => {
      a = createItem(d, 1000, 1000);
      c = createItem(d, 1000 + CARD_W - 40, 1010); // overlapping the right side of `a`
    });
    expect(b.items[a]).toMatchObject({ x: 1000, y: 1000 });
    expect(b.items[c]).toMatchObject({ x: 1000 + CARD_W + MIN_GAP, y: 1010 });
  });

  it('pushes a card that only touches another one out to the minimum gap', () => {
    let c = '';
    const b = boardWith((d) => {
      createItem(d, 0, 0);
      c = createItem(d, CARD_W + 4, 0);
    });
    expect(b.items[c].x).toBe(CARD_W + MIN_GAP);
  });

  it('leaves a card alone when it already has room around it', () => {
    let c = '';
    const b = boardWith((d) => {
      createItem(d, 0, 0);
      c = createItem(d, CARD_W + MIN_GAP + 5, 7);
    });
    expect(b.items[c]).toMatchObject({ x: CARD_W + MIN_GAP + 5, y: 7 });
  });

  it('keeps clear of the alternatives peeking out behind a stack', () => {
    let front = '';
    let c = '';
    const b = boardWith((d) => {
      front = createItem(d, 0, 0);
      addAlternative(d, front); // the old front card now peeks out 24px to the right
      c = createItem(d, CARD_W + MIN_GAP, 0);
    });
    const boxes = [...cardBoxes(b)].filter(([id]) => id !== c).map(([, box]) => box);
    const right = Math.max(...boxes.map((x) => x.x + x.w));
    expect(b.items[c].x).toBeGreaterThanOrEqual(right + MIN_GAP);
  });

  it('never leaves two loose cards overlapping after a drop', () => {
    const ids: string[] = [];
    const b = boardWith((d) => {
      for (let i = 0; i < 8; i++) ids.push(createItem(d, 500 + i * 24, 500 + i * 24));
    });
    for (const i of ids) {
      for (const j of ids) {
        if (i >= j) continue;
        const p = b.items[i];
        const q = b.items[j];
        const apart =
          p.x >= q.x + CARD_W + MIN_GAP ||
          q.x >= p.x + CARD_W + MIN_GAP ||
          p.y >= q.y + CARD_H + MIN_GAP ||
          q.y >= p.y + CARD_H + MIN_GAP;
        expect(apart).toBe(true);
      }
    }
  });
});

describe('cut-outs', () => {
  it('count toward the board bounds, rotation included', () => {
    const b = boardWith((d) => {
      d.clips.c = { img: '', x: 0, y: 0, w: 200, h: 100, rot: 90, z: 1 };
    });
    const round = (o: object) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v)]));
    expect(round(clipBounds(b.clips.c))).toEqual({ x1: 50, y1: -50, x2: 150, y2: 150 });
    expect(round(bounds(b)!)).toEqual({ x1: 50, y1: -50, x2: 150, y2: 150 });
  });
});

describe('room membership', () => {
  /** Two rooms side by side with one card each. */
  const twoRooms = () => {
    const ids = { a: '', b: '', cardA: '', cardB: '' };
    const board = boardWith((d) => {
      ids.a = createGroup(d, 0, 0, 700, 500);
      ids.b = createGroup(d, 1000, 0, 700, 500);
      ids.cardA = createItem(d, PAD, HEAD + PAD);
      ids.cardB = createItem(d, 1000 + PAD, HEAD + PAD);
    });
    return { board, ...ids };
  };

  it('gives a new card the room it was created in', () => {
    const { board, a, b, cardA, cardB } = twoRooms();
    expect(board.items[cardA].room).toBe(a);
    expect(board.items[cardB].room).toBe(b);
  });

  it('does not take the cards of a room another room is moved over', () => {
    const { board, a, b, cardA, cardB } = twoRooms();
    const moved = produce(board, (d) => {
      // What dragging room B onto room A does: B and its own cards move, then loose cards are adopted.
      for (const id of membersOf(d, b)) d.items[id].x -= 1000;
      d.groups[b].x = 0;
      adoptLooseCards(d, b);
    });
    expect(moved.items[cardA].room).toBe(a);
    expect(moved.items[cardB].room).toBe(b);
    expect(membersOf(moved, b)).toEqual([cardB]);
    expect(boardStats(moved).rooms.get(a)!.n).toBe(1);
  });

  it('adopts loose cards when a room is drawn around them', () => {
    const { board, a, cardA } = twoRooms();
    let loose = '';
    let big = '';
    const s = produce(board, (d) => {
      loose = createItem(d, 2000, 0);
      big = createGroup(d, -100, -100, 2500, 800);
      adoptLooseCards(d, big);
    });
    expect(s.items[loose].room).toBe(big);
    expect(s.items[cardA].room).toBe(a);
  });

  it('moves a dropped card into the room it lands in', () => {
    const { board, b, cardA } = twoRooms();
    const s = produce(board, (d) => {
      d.items[cardA].x += 1000;
      assignRoom(d, [cardA], cardA);
    });
    expect(s.items[cardA].room).toBe(b);
  });

  it('hands the cards of a deleted room to the room around it, or to none', () => {
    let outer = '';
    let inner = '';
    let card = '';
    const b = boardWith((d) => {
      outer = createGroup(d, 0, 0, 2000, 2000, 'Ev');
      inner = createGroup(d, 100, 100, 700, 500, 'Salon');
      card = createItem(d, 100 + PAD, 100 + HEAD + PAD);
    });
    expect(b.items[card].room).toBe(inner);
    const s = produce(b, (d) => deleteGroup(d, inner));
    expect(s.items[card].room).toBe(outer);
    expect(produce(s, (d) => deleteGroup(d, outer)).items[card].room).toBe('');
  });
});

describe('room resizing', () => {
  it('cannot shrink a room past its cards', () => {
    let gid = '';
    const b = boardWith((d) => {
      gid = createGroup(d, 0, 0, 1000, 800);
      createItem(d, 500, 300);
    });
    expect(roomMinSize(b, gid)).toEqual({ w: 500 + CARD_W + PAD, h: 300 + CARD_H + PAD });
  });

  it('counts the alternatives peeking out behind a stack', () => {
    let gid = '';
    const b = boardWith((d) => {
      gid = createGroup(d, 0, 0, 1000, 800);
      const front = createItem(d, 500, 300);
      addAlternative(d, front);
    });
    expect(roomMinSize(b, gid).w).toBe(500 + 24 + CARD_W + PAD);
  });

  it('ignores cards of other rooms and loose cards', () => {
    let gid = '';
    const b = boardWith((d) => {
      gid = createGroup(d, 0, 0, 700, 500);
      createItem(d, 2000, 2000);
    });
    expect(roomMinSize(b, gid)).toEqual({ w: CARD_W + PAD * 2, h: HEAD + 90 });
  });

  it('stops growing at a neighbouring room, keeping a gap', () => {
    let a = '';
    const b = boardWith((d) => {
      a = createGroup(d, 0, 0, 500, 400);
      createGroup(d, 600, 0, 500, 400); // to the right
      createGroup(d, 0, 500, 500, 400); // below
    });
    const limits = resizeLimits(b, a);
    expect(clampRoomSize(b.groups[a], 900, 300, limits)).toEqual({ w: 600 - MIN_GAP, h: 300 });
    expect(clampRoomSize(b.groups[a], 400, 800, limits)).toEqual({ w: 400, h: 500 - MIN_GAP });
    expect(clampRoomSize(b.groups[a], 550, 450, limits)).toEqual({ w: 550, h: 450 });
  });

  it('never lets a grown room swallow a card of another room', () => {
    let a = '';
    let other = '';
    let card = '';
    const b = boardWith((d) => {
      a = createGroup(d, 0, 0, 500, 400);
      other = createGroup(d, 700, 0, 900, 900);
      card = createItem(d, 720, HEAD + PAD);
    });
    const size = clampRoomSize(b.groups[a], 2000, 2000, resizeLimits(b, a));
    const grown = produce(b, (d) => {
      Object.assign(d.groups[a], size);
    });
    expect(roomAt(grown, grown.items[card])).toBe(other);
    expect(grown.items[card].room).toBe(other);
  });

  it('ignores rooms that already overlapped before the resize', () => {
    let a = '';
    const b = boardWith((d) => {
      a = createGroup(d, 0, 0, 500, 400);
      createGroup(d, 300, 300, 500, 400);
    });
    expect(clampRoomSize(b.groups[a], 900, 900, resizeLimits(b, a))).toEqual({ w: 900, h: 900 });
  });

  it('does not force a room to grow when a card already pokes out', () => {
    let gid = '';
    const b = boardWith((d) => {
      gid = createGroup(d, 0, 0, 600, 400);
      const id = createItem(d, 100, 150);
      d.items[id].x = 600 - CARD_W / 2 - 10; // anchor still inside, body over the right wall
    });
    expect(roomMinSize(b, gid).w).toBe(600);
  });
});

describe('stacks', () => {
  const twoCards = () => {
    const ids: string[] = [];
    const b = boardWith((d) => {
      ids.push(createItem(d, 1000, 0, { name: 'A', price: 100 }));
      ids.push(createItem(d, 2000, 0, { name: 'B', price: 200 }));
    });
    return { b, ids };
  };

  it('joins a dropped card behind the target and can undo it', () => {
    const { b, ids } = twoCards();
    let undo: ReturnType<typeof joinStack>['before'] | null = null;
    const joined = produce(b, (d) => {
      const r = joinStack(d, [ids[1]], ids[0]);
      undo = r.before;
      expect(r.size).toBe(2);
    });
    expect(stackMap(joined).get(ids[0])).toEqual([ids[1], ids[0]]);
    expect(joined.items[ids[1]]).toMatchObject({ x: 1000, y: 0 });

    const restored = produce(joined, (d) => {
      for (const [i, o] of undo!) Object.assign(d.items[i], o);
    });
    expect(stackMap(restored).size).toBe(0);
    expect(restored.items[ids[1]].x).toBe(2000);
  });

  it('moves a stack to another room as a whole', () => {
    const { b, ids } = twoCards();
    let gid = '';
    const s = produce(b, (d) => {
      joinStack(d, [ids[1]], ids[0]);
      gid = createGroup(d, 0, 400, 500, 400);
      moveToRoom(d, ids[1], gid);
    });
    expect(roomOf(s, s.items[ids[0]])).toBe(gid);
    expect(roomOf(s, s.items[ids[1]])).toBe(gid);
    expect(s.items[ids[0]]).toMatchObject({ x: s.items[ids[1]].x, y: s.items[ids[1]].y });
  });

  it('counts only one card per stack, preferring the bought option', () => {
    const { b, ids } = twoCards();
    const s = produce(b, (d) => {
      joinStack(d, [ids[1]], ids[0]);
      d.items[ids[0]].status = 'bought';
    });
    expect(reps(s).map((r) => r[0])).toEqual([ids[0]]);
    expect(boardStats(s).spent).toBe(100);
  });

  it('cycles and brings options to the front', () => {
    const { b, ids } = twoCards();
    let s = produce(b, (d) => {
      joinStack(d, [ids[1]], ids[0]);
    });
    expect(stackMap(s).get(ids[0])![0]).toBe(ids[1]);
    s = produce(s, (d) => cycleStack(d, ids[0], 1));
    expect(stackMap(s).get(ids[0])![0]).toBe(ids[0]);
    s = produce(s, (d) => bringFront(d, ids[1]));
    expect(stackMap(s).get(ids[0])![0]).toBe(ids[1]);
  });

  it('adds an alternative in front and dissolves a stack of one', () => {
    const { b, ids } = twoCards();
    let alt = '';
    let s = produce(b, (d) => {
      alt = addAlternative(d, ids[0])!;
    });
    expect(stackMap(s).get(ids[0])).toEqual([alt, ids[0]]);
    s = produce(s, (d) => deleteItem(d, alt));
    expect(s.items[ids[0]].stack).toBe('');
  });

  it('detaches a card next to its old stack', () => {
    const { b, ids } = twoCards();
    const s = produce(b, (d) => {
      joinStack(d, [ids[1]], ids[0]);
      detachFromStack(d, ids[1]);
    });
    expect(stackMap(s).size).toBe(0);
    expect(s.items[ids[1]].x).toBe(1000 + CARD_W + GAP + 60);
  });
});

describe('filters and stats', () => {
  it('matches delivery filters only for bought cards', () => {
    const base = { status: 'bought', delivery: 'shipped' } as const;
    expect(matches({ ...base } as never, 'awaiting')).toBe(true);
    expect(matches({ ...base, delivery: 'delivered' } as never, 'delivered')).toBe(true);
    expect(matches({ status: 'todo', delivery: '' } as never, 'awaiting')).toBe(false);
  });
});

describe('template and tidy', () => {
  it('builds the IKEA sample board with photos, links and two alternative stacks', () => {
    const b = boardWith(buildTemplate);
    expect(Object.values(b.groups).map((g) => g.name)).toEqual(['Salon', 'Yatak odası', 'Mutfak', 'Banyo']);
    expect(Object.keys(b.items)).toHaveLength(23);
    expect(stackMap(b).size).toBe(2);
    for (const it of Object.values(b.items)) {
      expect(it.img).toMatch(/^data:image\/jpeg;base64,/);
      expect(it.link).toMatch(/^https:\/\/www\.ikea\.com\.tr\/urun\//);
      expect(it.price).toBeGreaterThan(0);
    }
    const s = boardStats(b);
    expect(s.counts.all).toBe(21);
    expect(s.counts.awaiting).toBe(3);
  });

  it('places every sample card inside its room without touching another card', () => {
    const b = boardWith(buildTemplate);
    const boxes = [...cardBoxes(b)];
    for (const it of Object.values(b.items)) {
      expect(it.room).not.toBe('');
      expect(roomAt(b, it)).toBe(it.room);
    }
    for (const [i, p] of boxes) {
      for (const [j, q] of boxes) {
        if (i >= j || (b.items[i].stack && b.items[i].stack === b.items[j].stack)) continue;
        const apart = p.x >= q.x + q.w || q.x >= p.x + p.w || p.y >= q.y + q.h || q.y >= p.y + p.h;
        expect(apart, `${b.items[i].name} / ${b.items[j].name}`).toBe(true);
      }
    }
  });

  it('keeps every card in its room when tidying and can be undone exactly', () => {
    const b = boardWith(buildTemplate);
    const rooms = Object.fromEntries(Object.entries(b.items).map(([id, it]) => [id, it.room]));
    const snap = layoutSnapshot(b);
    const t = produce(b, (d) => {
      d.items[Object.keys(d.items)[0]].x += 37; // something to tidy
      tidy(d);
    });
    for (const [id, it] of Object.entries(t.items)) {
      expect(it.room).toBe(rooms[id]);
      expect(roomAt(t, it)).toBe(rooms[id]);
    }
    const undone = produce(t, (d) => restoreLayout(d, snap));
    expect(layoutSnapshot(undone)).toEqual(snap);
  });
});
