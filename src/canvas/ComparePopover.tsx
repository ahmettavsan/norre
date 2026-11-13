import { useEffect } from 'react';
import { CameraIcon, CloseIcon, StatusIcon } from '../components/icons';
import { STATUS } from '../domain/constants';
import { fmt, safeImg, total } from '../domain/format';
import { stackOf } from '../domain/stacks';
import { closeCompare } from '../store/actions';
import { useAppStore } from '../store/appStore';
import { useCardPopover } from './useCardPopover';

/** Every option of an alternatives stack side by side, opened with ⌘/Ctrl + click or the "N seçenek" badge. */
export function ComparePopover() {
  const id = useAppStore((s) => s.compare);
  const board = useAppStore((s) => s.board);
  const st = id ? stackOf(board, id) : null;
  const front = st ? board.items[st.ids[0]] : null;
  const { ref, style } = useCardPopover(front, closeCompare, 'center');

  // Close when the stack is gone (cards deleted or detached).
  useEffect(() => {
    if (id && !st) closeCompare();
  }, [id, st]);

  if (!st || !front) return null;

  // Keep the options in the order they were added, so cycling the stack does not reshuffle the row.
  const ids = [...st.ids].sort(
    (a, b) => (board.items[a].createdAt || 0) - (board.items[b].createdAt || 0) || (a < b ? -1 : 1),
  );
  const totals = ids.map((i) => total(board.items[i]));
  const priced = totals.filter((t) => t > 0);
  const cheapest = priced.length > 1 && new Set(priced).size > 1 ? Math.min(...priced) : null;

  return (
    <div ref={ref} className="compare glass" role="dialog" aria-label="Seçenekleri karşılaştır" style={style}>
      <div className="qp-head">
        <h3>{`${ids.length} seçenek`}</h3>
        <button className="tbtn" aria-label="Kapat" onClick={closeCompare}>
          <CloseIcon />
        </button>
      </div>
      <div className="cmp-row">
        {ids.map((i, n) => {
          const it = board.items[i];
          const qty = Number(it.qty) || 1;
          return (
            <div key={i} className={`cmp-opt s-${it.status}`}>
              <div className="cmp-img">{safeImg(it.img) ? <img src={it.img} alt="" /> : <CameraIcon />}</div>
              {cheapest !== null && totals[n] === cheapest && <span className="cmp-best">En uygun</span>}
              <div className="cmp-name">{it.name || 'İsimsiz eşya'}</div>
              {it.note && <div className="cmp-note">{it.note}</div>}
              <div className="cmp-price">
                {totals[n] ? fmt(totals[n]) : <span className="muted">fiyat?</span>}
              </div>
              {qty > 1 && it.price > 0 && <div className="cmp-unit">{`${qty} adet × ${fmt(it.price)}`}</div>}
              <span className="pill-btn" data-act="status">
                <StatusIcon status={it.status} />
                {STATUS[it.status]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
