import { produce } from 'immer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGroup, createItem, emptyBoard } from '../domain/board';
import type { Board } from '../domain/types';

/** An in-memory stand-in for the two Supabase tables, with the query calls cloud.ts uses. */
const db = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const tables: Record<string, Row[]> = { boards: [], photos: [] };
  const requests: { table: string; op: string; rows?: number }[] = [];
  const keyOf = (table: string, r: Row) => (table === 'boards' ? `${r.owner}` : `${r.owner}/${r.id}`);

  function query(table: string) {
    const filters: ((r: Row) => boolean)[] = [];
    let op: 'select' | 'delete' = 'select';
    const rows = () => tables[table].filter((r) => filters.every((f) => f(r)));
    const builder = {
      select: () => builder,
      eq: (k: string, v: unknown) => (filters.push((r) => r[k] === v), builder),
      in: (k: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[k])), builder),
      delete: () => ((op = 'delete'), builder),
      maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
      upsert: async (input: Row | Row[]) => {
        const list = Array.isArray(input) ? input : [input];
        requests.push({ table, op: 'upsert', rows: list.length });
        for (const row of list) {
          tables[table] = tables[table].filter((r) => keyOf(table, r) !== keyOf(table, row));
          tables[table].push({ ...row });
        }
        return { error: null };
      },
      then: (done: (v: { data: Row[] | null; error: null }) => void) => {
        if (op === 'delete') {
          const gone = new Set(rows());
          requests.push({ table, op: 'delete', rows: gone.size });
          tables[table] = tables[table].filter((r) => !gone.has(r));
          return done({ data: null, error: null });
        }
        return done({ data: rows(), error: null });
      },
    };
    return builder;
  }
  return { tables, requests, client: { from: query } };
});

vi.mock('../lib/supabase', () => ({ supabase: db.client }));

const { fetchBoard, resetCloud, storeBoard } = await import('./cloud');

const IMG = (n: number) => `data:image/jpeg;base64,${'A'.repeat(n)}`;

function sampleBoard(): Board {
  return produce(emptyBoard(), (d) => {
    createGroup(d, 0, 0, 700, 500, 'Salon');
    createItem(d, 20, 120, { name: 'Koltuk', img: IMG(10) });
    createItem(d, 300, 120, { name: 'Halı', img: IMG(20) });
    createItem(d, 20, 400, { name: 'Lamba' });
  });
}

describe('saving to Supabase', () => {
  beforeEach(() => {
    db.tables.boards = [];
    db.tables.photos = [];
    db.requests.length = 0;
    resetCloud();
  });

  it('gives back exactly the board that was saved', async () => {
    const board = sampleBoard();
    await storeBoard('u1', board);
    resetCloud();
    expect(await fetchBoard('u1')).toEqual(board);
  });

  it('keeps photos out of the board row and uploads each photo once', async () => {
    const board = sampleBoard();
    await storeBoard('u1', board);
    expect(JSON.stringify(db.tables.boards[0].data)).not.toContain('base64');
    expect(db.tables.photos).toHaveLength(2);

    db.requests.length = 0;
    const renamed = produce(board, (d) => {
      Object.values(d.items)[2].name = 'Yer lambası';
    });
    await storeBoard('u1', renamed);
    expect(db.requests.filter((r) => r.table === 'photos')).toEqual([]);
  });

  it('deletes photos nothing uses any more', async () => {
    const board = sampleBoard();
    await storeBoard('u1', board);
    const without = produce(board, (d) => {
      Object.values(d.items)[0].img = '';
    });
    await storeBoard('u1', without);
    expect(db.tables.photos).toHaveLength(1);
    expect(await fetchBoard('u1')).toEqual(without);
  });

  it("keeps users' boards apart and returns null for a user without one", async () => {
    await storeBoard('u1', sampleBoard());
    expect(await fetchBoard('u2')).toBeNull();
  });
});
