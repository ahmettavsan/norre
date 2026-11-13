import { ZOOM_MAX, ZOOM_MIN } from '../domain/constants';
import { clamp } from '../domain/format';
import { bounds } from '../domain/geometry';
import { getState, setState } from './appStore';

/* Pan / zoom of the infinite board. Needs the viewport element to measure the screen. */

let viewportEl: HTMLElement | null = null;

export function registerViewport(el: HTMLElement | null): void {
  viewportEl = el;
}

export const viewportRect = (): DOMRect => (viewportEl ? viewportEl.getBoundingClientRect() : new DOMRect());

/** Screen (client) coordinates → board coordinates. */
export function toWorld(cx: number, cy: number): { x: number; y: number } {
  const r = viewportRect();
  const v = getState().view;
  return { x: (cx - r.left - v.x) / v.k, y: (cy - r.top - v.y) / v.k };
}

let lastPointer: { x: number; y: number } | null = null;

/** Remembers where the pointer is over the board (client coordinates), for keyboard actions. */
export function trackPointer(cx: number, cy: number): void {
  lastPointer = { x: cx, y: cy };
}

/** Board point under the pointer, or the center of the screen when the pointer has not been seen. */
export function pointerWorld(): { x: number; y: number } {
  if (lastPointer) return toWorld(lastPointer.x, lastPointer.y);
  const r = viewportRect();
  return toWorld(r.left + r.width / 2, r.top + r.height / 2);
}

/** Zooms keeping the board point under (px, py) (viewport coordinates) in place. */
export function zoomAt(px: number, py: number, k: number): void {
  const v = getState().view;
  k = clamp(k, ZOOM_MIN, ZOOM_MAX);
  const wx = (px - v.x) / v.k;
  const wy = (py - v.y) / v.k;
  setState({ view: { x: px - wx * k, y: py - wy * k, k } });
}

export function zoomCenter(f: number): void {
  const r = viewportRect();
  zoomAt(r.width / 2, r.height / 2, getState().view.k * f);
}

export function panBy(dx: number, dy: number): void {
  const v = getState().view;
  setState({ view: { ...v, x: v.x - dx, y: v.y - dy } });
}

/** Fits every room and card on screen, leaving room for the filter panel and the bottom bars. */
export function fitAll(): void {
  const { board } = getState();
  const b = bounds(board);
  const r = viewportRect();
  if (!b) {
    setState({ view: { x: 40, y: 40, k: 1 } });
    return;
  }
  const m = r.width < 640 ? 24 : 70;
  const bottomSpace = 70;
  const lp = r.width > 900 ? 250 : 0;
  const k = clamp(
    Math.min((r.width - lp - m * 2) / (b.x2 - b.x1), (r.height - m * 2 - bottomSpace) / (b.y2 - b.y1)),
    0.2,
    1.1,
  );
  setState({
    view: {
      k,
      x: lp + (r.width - lp - (b.x2 - b.x1) * k) / 2 - b.x1 * k,
      y: (r.height - bottomSpace - (b.y2 - b.y1) * k) / 2 - b.y1 * k,
    },
  });
}

/** Centers a board rectangle in the part of the screen not covered by the inspector. */
export function focusOn(x: number, y: number, w: number, h: number): void {
  const r = viewportRect();
  const { view, drawer } = getState();
  const k = clamp(Math.max(view.k, 0.8), 0.2, 1.2);
  const visW = r.width > 640 && drawer ? r.width - 370 : r.width;
  const visH = r.width <= 640 && drawer ? r.height * 0.28 : r.height;
  setState({ view: { k, x: visW / 2 - (x + w / 2) * k, y: visH / 2 - (y + h / 2) * k } });
}
