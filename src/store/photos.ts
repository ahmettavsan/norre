import type { Board } from '../domain/types';

/*
 * Photos are stored apart from the board: the saved board refers to each one as "photo:<key>", where the
 * key is a hash of the image. In memory the board keeps the images inline, so the rest of the app never
 * sees the difference.
 */

const REF = 'photo:';
const keys = new Map<string, string>();

/** A stable key for an image: the first 32 hex digits of its SHA-256. */
export async function photoKey(dataUrl: string): Promise<string> {
  let key = keys.get(dataUrl);
  if (!key) {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataUrl));
    key = [...new Uint8Array(hash)]
      .slice(0, 16)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    keys.set(dataUrl, key);
  }
  return key;
}

const isPhoto = (img: string | undefined): img is string => !!img && img.startsWith('data:image/');

/** The board to save, with photo references instead of images, and the images by key. */
export async function extractPhotos(board: Board): Promise<{ data: Board; photos: Map<string, string> }> {
  const photos = new Map<string, string>();
  const ref = async (img: string) => {
    const key = await photoKey(img);
    photos.set(key, img);
    return REF + key;
  };
  const items: Board['items'] = {};
  for (const [id, it] of Object.entries(board.items))
    items[id] = isPhoto(it.img) ? { ...it, img: await ref(it.img) } : it;
  const clips: Board['clips'] = {};
  for (const [id, c] of Object.entries(board.clips))
    clips[id] = isPhoto(c.img) ? { ...c, img: await ref(c.img) } : c;
  return { data: { ...board, items, clips }, photos };
}

/** Puts the images back in place of their references. A missing photo leaves the card without one. */
export function inlinePhotos(board: Board, photos: Map<string, string>): Board {
  const back = <T extends { img?: string }>(o: T): T =>
    o.img?.startsWith(REF) ? { ...o, img: photos.get(o.img.slice(REF.length)) || '' } : o;
  const items: Board['items'] = {};
  for (const [id, it] of Object.entries(board.items)) items[id] = back(it);
  const clips: Board['clips'] = {};
  for (const [id, c] of Object.entries(board.clips)) clips[id] = back(c);
  return { ...board, items, clips };
}
