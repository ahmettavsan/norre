import type { Board } from '../domain/types';
import { supabase } from '../lib/supabase';
import { normalizeBoard } from './persistence';
import { extractPhotos, inlinePhotos } from './photos';

/* Reads and writes the signed-in user's board in Supabase (tables in supabase/schema.sql). */

/** Keys of the photos already stored for the current user. */
let stored = new Set<string>();

/** Forgets what was stored, when the user signs out. */
export function resetCloud(): void {
  stored = new Set();
}

/** The user's saved board, or null when they have none yet. */
export async function fetchBoard(owner: string): Promise<Board | null> {
  const { data: row, error } = await supabase.from('boards').select('data').eq('owner', owner).maybeSingle();
  if (error) throw error;
  if (!row) return null;
  const { data: rows, error: photoError } = await supabase
    .from('photos')
    .select('id, data')
    .eq('owner', owner);
  if (photoError) throw photoError;
  stored = new Set(rows.map((r) => r.id as string));
  return inlinePhotos(normalizeBoard(row.data), new Map(rows.map((r) => [r.id as string, r.data as string])));
}

/** Saves the board: new photos first, then the board, then photos nothing refers to any more. */
export async function storeBoard(owner: string, board: Board): Promise<void> {
  const { data, photos } = await extractPhotos(board);

  const fresh = [...photos].filter(([key]) => !stored.has(key));
  // A few photos per request keeps every request small.
  for (let i = 0; i < fresh.length; i += 10) {
    const batch = fresh.slice(i, i + 10);
    const { error } = await supabase
      .from('photos')
      .upsert(batch.map(([id, img]) => ({ owner, id, data: img })));
    if (error) throw error;
    for (const [id] of batch) stored.add(id);
  }

  const { error } = await supabase
    .from('boards')
    .upsert({ owner, data, updated_at: new Date().toISOString() });
  if (error) throw error;

  const unused = [...stored].filter((key) => !photos.has(key));
  if (unused.length) {
    const { error: deleteError } = await supabase.from('photos').delete().eq('owner', owner).in('id', unused);
    if (!deleteError) for (const key of unused) stored.delete(key);
  }
}
