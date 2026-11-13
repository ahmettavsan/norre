import { PAYMENT } from '../../domain/constants';
import type { Item } from '../../domain/types';
import { updateItem } from '../../store/actions';
import { BufferedInput, Segmented } from './parts';

/** The "Ödeme" box in the item inspector, shown once the item is bought. */
export function PaymentBox({ id, item }: { id: string; item: Item }) {
  return (
    <div className="pay-box" hidden={item.status !== 'bought'}>
      <span className="legend">Ödeme</span>
      <PaymentFields id={id} item={item} />
    </div>
  );
}

/**
 * Cash / installments, purchase date and, for installment purchases,
 * card / installment count / first installment date. Shared by the inspector and the quick popover.
 */
export function PaymentFields({ id, item: it }: { id: string; item: Item }) {
  const set = (patch: Partial<Item>) => updateItem(id, patch);
  const payment = it.payment || 'full';

  return (
    <>
      <Segmented field="payment" options={PAYMENT} value={payment} onChange={(v) => set({ payment: v })} />
      <label className="field">
        <span>Alış tarihi</span>
        <input
          className="input"
          data-f="purchaseDate"
          type="date"
          value={it.purchaseDate ?? ''}
          onChange={(e) => set({ purchaseDate: e.target.value })}
        />
      </label>
      {payment === 'installments' && (
        <>
          <label className="field">
            <span>Kredi kartı</span>
            <input
              className="input"
              data-f="card"
              placeholder="Örneğin Bonus"
              autoComplete="off"
              value={it.card ?? ''}
              onChange={(e) => set({ card: e.target.value })}
            />
          </label>
          <div className="row">
            <label className="field" style={{ flex: 0.55 }}>
              <span>Taksit</span>
              <BufferedInput
                className="input"
                data-f="installments"
                type="number"
                min={2}
                step={1}
                placeholder="6"
                value={it.installments ? String(it.installments) : ''}
                onValue={(v) => {
                  const n = parseInt(v, 10);
                  set({ installments: n > 0 ? n : undefined });
                }}
              />
            </label>
            <label className="field">
              <span>İlk taksit</span>
              <input
                className="input"
                data-f="firstInstallment"
                type="date"
                value={it.firstInstallment ?? ''}
                onChange={(e) => set({ firstInstallment: e.target.value })}
              />
            </label>
          </div>
        </>
      )}
    </>
  );
}
