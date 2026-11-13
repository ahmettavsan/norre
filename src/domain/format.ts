import type { Item } from './types';

const money = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  maximumFractionDigits: 0,
});

export const fmt = (n: number | undefined): string => money.format(Math.round(n || 0));

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export const total = (it: Pick<Item, 'price' | 'qty'>): number =>
  (Number(it.price) || 0) * (Number(it.qty) || 1);

/** Parses Turkish formatted numbers: "1.500,50" → 1500.5 */
export function parseNum(v: string): number {
  const s = String(v)
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
}

export function uid(): string {
  const raw =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);
  return raw.replace(/[^a-zA-Z0-9-]/g, '');
}

/** Only images we produced ourselves (data URLs) or hosted blobs may be rendered. */
export const safeImg = (u: unknown): u is string =>
  typeof u === 'string' && (u.startsWith('/_blob/') || u.startsWith('data:image/'));

export const isHttpUrl = (s: string | undefined): boolean => /^https?:\/\//i.test(s || '');
