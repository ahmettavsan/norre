import { describe, expect, it } from 'vitest';
import { emptyBoard } from '../domain/board';
import type { Board } from '../domain/types';
import { extractPhotos, inlinePhotos } from './photos';

const IMG_A = 'data:image/jpeg;base64,AAAA';
const IMG_B = 'data:image/webp;base64,BBBB';

const board = (): Board => ({
  ...emptyBoard(),
  items: {
    a: { name: 'Koltuk', img: IMG_A } as Board['items'][string],
    b: { name: 'Halı', img: IMG_A } as Board['items'][string],
    c: { name: 'Masa' } as Board['items'][string],
  },
  clips: { k: { img: IMG_B, x: 0, y: 0, w: 10, h: 10, rot: 0, z: 1 } },
});

describe('photos saved apart from the board', () => {
  it('replaces each image with a reference, storing a shared image once', async () => {
    const { data, photos } = await extractPhotos(board());
    expect(photos.size).toBe(2);
    expect(data.items.a.img).toMatch(/^photo:[0-9a-f]{32}$/);
    expect(data.items.b.img).toBe(data.items.a.img);
    expect(data.items.c.img).toBeUndefined();
    expect(data.clips.k.img).toMatch(/^photo:/);
    expect(JSON.stringify(data)).not.toContain('base64');
  });

  it('puts the images back exactly', async () => {
    const original = board();
    const { data, photos } = await extractPhotos(original);
    expect(inlinePhotos(data, photos)).toEqual(original);
  });

  it('leaves a card without a photo when its photo is missing', async () => {
    const { data } = await extractPhotos(board());
    expect(inlinePhotos(data, new Map()).items.a.img).toBe('');
  });
});
