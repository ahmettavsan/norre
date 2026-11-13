import { memo, type MouseEvent } from 'react';
import { ChevronLeft, ChevronRight, DeliveryIcon, LinkIcon, NoteIcon, StatusIcon } from '../components/icons';
import { DELIV_SHORT, STATUS } from '../domain/constants';
import { fmt, safeImg, total } from '../domain/format';
import type { Item } from '../domain/types';
import { MOD_KEY } from '../lib/platform';
import { cycleDelivery, cycleStack, cycleStatus, openCompare } from '../store/actions';

export interface CardPlacement {
  left: number;
  top: number;
  /** Position in its stack (0 = front), or null when not stacked. */
  depth: number | null;
  /** Number of options in the stack; shown on the front card only. */
  stackSize: number;
}

interface Props extends CardPlacement {
  id: string;
  item: Item;
  selected: boolean;
  dragging: boolean;
  dim: boolean;
  dropInto: boolean;
}

/** Stops the click from reaching the board (no drag / no inspector) and runs the card action. */
const act = (fn: () => void) => (e: MouseEvent) => {
  e.stopPropagation();
  fn();
};

export const ItemCard = memo(function ItemCard(props: Props) {
  const { id, item: it, left, top, depth, stackSize, selected, dragging, dim, dropInto } = props;
  const hasImg = safeImg(it.img);
  const t = total(it);
  const dv = it.delivery || 'pending';
  const qty = Number(it.qty) || 1;

  const cls =
    `tag${hasImg ? ' has-img' : ''} s-${it.status} d-${it.status === 'bought' ? dv : 'none'}` +
    (selected ? ' selected' : '') +
    (dragging ? ' dragging' : '') +
    (dim ? ' dim' : '') +
    (depth === null ? '' : depth === 0 ? ' stacked' : ' back d' + Math.min(depth, 2)) +
    (dropInto ? ' drop-into' : '');

  return (
    <div
      className={cls}
      data-id={id}
      style={{ left, top, display: depth !== null && depth > 2 ? 'none' : undefined }}
      title={depth ? 'Öne getirmek için tıkla' : undefined}
    >
      {depth === 0 && stackSize > 0 && (
        <div className="stk">
          <button
            type="button"
            title="Önceki seçenek"
            aria-label="Önceki seçenek"
            onClick={act(() => cycleStack(id, -1))}
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className="stk-all"
            title={`Tüm seçenekleri yan yana gör (${MOD_KEY} + tıkla)`}
            onClick={act(() => openCompare(id))}
          >
            {`${stackSize} seçenek`}
          </button>
          <button
            type="button"
            title="Sonraki seçenek"
            aria-label="Sonraki seçenek"
            onClick={act(() => cycleStack(id, 1))}
          >
            <ChevronRight />
          </button>
        </div>
      )}
      {it.priority === 'urgent' && <span className="pri" title="Öncelikli" />}
      {hasImg && (
        <div className="t-img">
          <img src={it.img} alt="" draggable={false} />
        </div>
      )}
      <div className="t-name">{it.name || 'İsimsiz eşya'}</div>
      {!hasImg && (
        <div className="t-sub">
          {it.store && <span>{it.store}</span>}
          {qty > 1 && <span>{`${qty} adet`}</span>}
          {it.note && <NoteIcon />}
          {it.link && <LinkIcon />}
        </div>
      )}
      <div className="t-price">{t ? fmt(t) : <span className="muted">fiyat?</span>}</div>
      <div className="t-foot">
        <button
          className="pill-btn"
          data-act="status"
          title="Durumu değiştir"
          onClick={act(() => cycleStatus(id))}
        >
          <StatusIcon status={it.status} />
          {STATUS[it.status]}
        </button>
        {it.status === 'bought' && (
          <button
            className={'pill-btn dv-' + dv}
            data-act="delivery"
            title="Teslimat durumunu değiştir"
            onClick={act(() => cycleDelivery(id))}
          >
            <DeliveryIcon delivery={dv} />
            {DELIV_SHORT[dv]}
          </button>
        )}
      </div>
    </div>
  );
});
