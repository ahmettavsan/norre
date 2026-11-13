import type { ReactNode } from 'react';
import { FILTER_LABEL } from '../domain/constants';
import type { Filter } from '../domain/types';
import { useBoardStats } from '../hooks/useBoardDerived';
import { setFilter, setHideUnmatched } from '../store/actions';
import { useAppStore } from '../store/appStore';
import { DeliveredIcon, TruckIcon } from './icons';

function Option({ value, children }: { value: Filter; children?: ReactNode }) {
  const checked = useAppStore((s) => s.filter === value);
  const n = useBoardStats().counts[value];
  return (
    <label className={'fp-opt' + (n ? '' : ' zero')}>
      <input type="radio" name="flt" value={value} checked={checked} onChange={() => setFilter(value)} />
      {children}
      <span className="fp-lbl">{FILTER_LABEL[value]}</span>
      <span className="fp-n">{n}</span>
    </label>
  );
}

export function FilterPanel() {
  const hide = useAppStore((s) => s.hideUnmatched);

  return (
    <aside className="fpanel" aria-label="Filtre">
      <div className="fp-body" role="radiogroup" aria-label="Kartları filtrele">
        <Option value="all" />
        <div className="fp-group">Satın alma</div>
        <Option value="todo">
          <span className="fp-sw" style={{ background: 'var(--status-todo)' }} />
        </Option>
        <Option value="looking">
          <span className="fp-sw" style={{ background: 'var(--status-looking)' }} />
        </Option>
        <Option value="bought">
          <span className="fp-sw" style={{ background: 'var(--status-bought)' }} />
        </Option>
        <div className="fp-group">Teslimat</div>
        <Option value="awaiting">
          <span className="fp-ic">
            <TruckIcon />
          </span>
        </Option>
        <Option value="delivered">
          <span className="fp-ic">
            <DeliveredIcon />
          </span>
        </Option>
        <label className="fp-hide">
          <input type="checkbox" checked={hide} onChange={(e) => setHideUnmatched(e.target.checked)} />
          <span>Diğerlerini tamamen gizle</span>
        </label>
      </div>
    </aside>
  );
}
