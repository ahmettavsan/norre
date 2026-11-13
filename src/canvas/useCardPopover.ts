import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { CARD_H, CARD_W } from '../domain/constants';
import { useAppStore } from '../store/appStore';
import { viewportRect } from '../store/viewActions';

const MARGIN = 12;
const OFFSET = 10;

/**
 * Places a screen-space popover under a card (above it when there is no room below), keeps it there
 * while the board pans or zooms, and calls `onClose` on any press outside it.
 * `card` is the card's board position; pass null while the popover is closed.
 */
export function useCardPopover(
  card: { x: number; y: number } | null,
  onClose: () => void,
  align: 'start' | 'center' = 'start',
) {
  const ref = useRef<HTMLDivElement>(null);
  const view = useAppStore((s) => s.view);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [, setResizeTick] = useState(0);
  const open = !!card;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onResize = () => setResizeTick((n) => n + 1);
    document.addEventListener('pointerdown', onDown, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, onClose]);

  // Measure (and re-measure as the content changes) so the popover can flip and stay on screen.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    const measure = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  let style: CSSProperties | undefined;
  if (card) {
    const vp = viewportRect();
    const cardLeft = view.x + card.x * view.k;
    const cardTop = view.y + card.y * view.k;
    const cardBottom = cardTop + CARD_H * view.k;
    const wanted = align === 'center' ? cardLeft + (CARD_W * view.k) / 2 - size.w / 2 : cardLeft;
    const left = Math.max(MARGIN, Math.min(wanted, vp.width - size.w - MARGIN));
    let top = cardBottom + OFFSET;
    if (top + size.h > vp.height - MARGIN) {
      const above = cardTop - OFFSET - size.h;
      top = above >= MARGIN ? above : Math.max(MARGIN, vp.height - size.h - MARGIN);
    }
    style = { left, top };
  }
  return { ref, style };
}
