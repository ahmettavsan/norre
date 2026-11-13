import { useEffect } from 'react';
import { CloseIcon } from '../components/icons';
import { PaymentFields } from '../components/drawer/PaymentBox';
import { BufferedInput } from '../components/drawer/parts';
import { parseNum } from '../domain/format';
import { closeQuickPay, updateItem } from '../store/actions';
import { useAppStore } from '../store/appStore';
import { useCardPopover } from './useCardPopover';

/**
 * Small form that pops up under a card right after it is marked as bought, for price and payment details.
 * Drawn in screen space (stays readable at any zoom) and follows the card while the board pans.
 */
export function QuickPayPopover() {
  const id = useAppStore((s) => s.quickPay);
  const it = useAppStore((s) => (s.quickPay ? s.board.items[s.quickPay] : undefined));
  const open = !!id && !!it && it.status === 'bought';
  const { ref, style } = useCardPopover(open && it ? it : null, closeQuickPay);

  // Close when the card disappears or stops being "bought" in some other way.
  useEffect(() => {
    if (id && !open) closeQuickPay();
  }, [id, open]);

  // Start typing the price straight away.
  useEffect(() => {
    if (!open) return;
    const f = ref.current?.querySelector<HTMLInputElement>('[data-f="qp-price"]');
    f?.focus();
    f?.select();
  }, [open, id, ref]);

  if (!open || !id || !it) return null;

  const qty = Number(it.qty) || 1;

  return (
    <div
      ref={ref}
      className="quick-pay glass"
      role="dialog"
      aria-label={`${it.name || 'Eşya'} ödeme bilgileri`}
      style={style}
    >
      <div className="qp-head">
        <h3>{it.name || 'İsimsiz eşya'}</h3>
        <button className="tbtn" aria-label="Kapat" onClick={closeQuickPay}>
          <CloseIcon />
        </button>
      </div>
      <div className="qp-sub">Alındı olarak işaretlendi</div>
      <label className="field">
        <span>{qty > 1 ? `Birim fiyat (₺) · ${qty} adet` : 'Fiyat (₺)'}</span>
        <BufferedInput
          className="input"
          data-f="qp-price"
          inputMode="decimal"
          placeholder="0"
          value={it.price ? String(it.price).replace('.', ',') : ''}
          onValue={(v) => updateItem(id, { price: parseNum(v) })}
          onKeyDown={(e) => e.key === 'Enter' && closeQuickPay()}
        />
      </label>
      <div className="field">
        <span className="legend">Ödeme</span>
        <PaymentFields id={id} item={it} />
      </div>
      <div className="qp-foot">
        <button type="button" className="btn primary" onClick={closeQuickPay}>
          Tamam
        </button>
      </div>
    </div>
  );
}
