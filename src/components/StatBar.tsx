import { fmt } from '../domain/format';
import { useBoardStats } from '../hooks/useBoardDerived';
import { openDrawer } from '../store/actions';
import { useAppStore } from '../store/appStore';

export function StatBar() {
  const { spent, planned } = useBoardStats();
  const budget = useAppStore((s) => Number(s.board.meta.budget) || 0);
  const openSummary = () => openDrawer('summary');

  return (
    <div className="statbar glass">
      <button className="stat" onClick={openSummary}>
        <small>Harcanan</small>
        <b>{fmt(spent)}</b>
      </button>
      <button className="stat opt" onClick={openSummary}>
        <small>Alınacaklar</small>
        <b>{fmt(planned - spent)}</b>
      </button>
      <button
        className={'stat opt' + (budget && budget - spent < 0 ? ' over' : '')}
        onClick={() => openDrawer('summary', null, budget ? undefined : 'budget')}
      >
        <small>{budget ? 'Bütçeden kalan' : 'Bütçe'}</small>
        {budget ? <b>{fmt(budget - spent)}</b> : <b className="stat-set">Belirle</b>}
      </button>
    </div>
  );
}
