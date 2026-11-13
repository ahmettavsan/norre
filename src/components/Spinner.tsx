import type { CSSProperties } from 'react';

/** The eight blocks of the ring, clockwise from the top left, as [row, column]. */
const BLOCKS = [
  [1, 1],
  [1, 2],
  [1, 3],
  [2, 3],
  [3, 3],
  [3, 2],
  [3, 1],
  [2, 1],
];

/**
 * The app's loading indicator: a ring of eight pixel blocks with a bright block running around it.
 * `px` is the size of one block; it takes the colour of the text around it.
 */
export function Spinner({ px = 4, label = 'Yükleniyor' }: { px?: number; label?: string }) {
  return (
    <span className="spinner" role="status" aria-label={label} style={{ '--px': px + 'px' } as CSSProperties}>
      {BLOCKS.map(([row, col], i) => (
        <i key={i} style={{ gridArea: `${row} / ${col}`, animationDelay: `${(i - BLOCKS.length) * 0.1}s` }} />
      ))}
    </span>
  );
}
