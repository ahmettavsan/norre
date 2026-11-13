import { useState, type InputHTMLAttributes } from 'react';
import { closeDrawer } from '../../store/actions';
import { CloseIcon } from '../icons';

export function DrawerHead({ title }: { title: string }) {
  return (
    <div className="d-head">
      <h2>{title}</h2>
      <button className="tbtn" aria-label="Kapat" onClick={closeDrawer}>
        <CloseIcon />
      </button>
    </div>
  );
}

export function Segmented<K extends string>({
  field,
  options,
  value,
  onChange,
}: {
  field: string;
  options: Record<K, string>;
  value: K;
  onChange: (v: K) => void;
}) {
  return (
    <div className="seg" data-seg={field} role="group">
      {(Object.entries(options) as [K, string][]).map(([k, label]) => (
        <button key={k} type="button" data-v={k} aria-pressed={value === k} onClick={() => onChange(k)}>
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * An input that reports every keystroke but, while focused, keeps showing exactly what the user typed.
 * Needed for formatted numbers ("1.500") where the stored value would otherwise reformat mid-typing.
 */
export function BufferedInput({
  value,
  onValue,
  ...rest
}: { value: string; onValue: (text: string) => void } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange'
>) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      {...rest}
      value={draft ?? value}
      onFocus={(e) => {
        setDraft(e.target.value);
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        setDraft(null);
        rest.onBlur?.(e);
      }}
      onChange={(e) => {
        setDraft(e.target.value);
        onValue(e.target.value);
      }}
    />
  );
}

/** Two-step delete: the first click asks "Emin misin? Sil", the second one deletes. */
export function ConfirmDeleteButton({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      className={'btn danger' + (armed ? ' confirm' : '')}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
    >
      {armed ? 'Emin misin? Sil' : label}
    </button>
  );
}
