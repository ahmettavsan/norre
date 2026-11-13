import { useMemo } from 'react';
import { fmt, parseNum } from '../../domain/format';
import { roomSummaries } from '../../domain/stats';
import { openDrawer, setBudget } from '../../store/actions';
import { getState, useAppStore } from '../../store/appStore';
import { focusOn } from '../../store/viewActions';
import { useBoardStats } from '../../hooks/useBoardDerived';
import { BufferedInput, DrawerHead } from './parts';

function gotoGroup(id: string) {
  const g = getState().board.groups[id];
  if (!g) return;
  openDrawer('group', id);
  focusOn(g.x, g.y, Math.min(g.w, 500), Math.min(g.h, 400));
}

/** Spent, still to buy and the budget on one bar, with the spent amount written large. */
function Receipt({ budget }: { budget: number }) {
  const { spent, planned } = useBoardStats();
  const toBuy = planned - spent;
  const scale = Math.max(planned, budget) || 1;
  const pct = (v: number) => `${(Math.max(0, v) / scale) * 100}%`;
  const left = budget - spent;

  return (
    <section className="sum-receipt">
      <div className="sum-label">Harcanan</div>
      <div className="sum-big">{fmt(spent)}</div>
      <div className="sum-track" aria-hidden="true">
        <div className="sum-bar">
          <i className="sb-spent" style={{ width: pct(spent) }} />
          <i className="sb-todo" style={{ width: pct(toBuy) }} />
        </div>
        {budget > 0 && <b className="sb-budget" style={{ left: pct(budget) }} title="Bütçe" />}
      </div>
      <div className="sum-legend">
        <span>{`${fmt(toBuy)} alınacak`}</span>
        {budget > 0 && (
          <span className={left < 0 ? 'over' : undefined}>
            {left < 0 ? `Bütçe ${fmt(-left)} aşıldı` : `Bütçeden kalan ${fmt(left)}`}
          </span>
        )}
      </div>
      <label className="field">
        <span>Toplam bütçe (₺)</span>
        <BufferedInput
          className="input"
          data-f="budget"
          inputMode="decimal"
          placeholder="Örneğin 300.000"
          value={budget ? budget.toLocaleString('tr-TR') : ''}
          onValue={(v) => setBudget(parseNum(v))}
        />
      </label>
    </section>
  );
}

export function SummaryPanel() {
  const board = useAppStore((s) => s.board);
  const rooms = useMemo(() => roomSummaries(board), [board]);

  return (
    <>
      <DrawerHead title="Özet" />
      <div className="d-body">
        <Receipt budget={Number(board.meta.budget) || 0} />
        <div className="sec-title">Odalar</div>
        {rooms.length ? (
          rooms.map((r) => (
            <button key={r.id} className="sum-room" onClick={() => gotoGroup(r.id)}>
              <span className="sr-dot" style={{ background: r.g.color }} />
              <span className="sr-name">{r.g.name || 'İsimsiz oda'}</span>
              <span className="sr-count">{r.n ? `${r.done}/${r.n} alındı` : 'Boş'}</span>
              <span className="sr-bar">
                <i style={{ width: `${r.sum ? (r.spent / r.sum) * 100 : 0}%`, background: r.g.color }} />
              </span>
              <span className="sr-money">
                <b>{fmt(r.spent)}</b>
                {` / ${fmt(r.sum)}`}
              </span>
            </button>
          ))
        ) : (
          <p className="note">Henüz oda yok.</p>
        )}
      </div>
    </>
  );
}
