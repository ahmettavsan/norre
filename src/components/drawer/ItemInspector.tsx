import { useEffect } from 'react';
import { DELIV_SHORT, PRI, STATUS } from '../../domain/constants';
import { isHttpUrl, parseNum } from '../../domain/format';
import { roomOf } from '../../domain/geometry';
import {
  closeDrawer,
  deleteSelectedItem,
  moveItemToRoom,
  setItemDelivery,
  setItemPriority,
  setItemStatus,
  updateItem,
} from '../../store/actions';
import { useAppStore } from '../../store/appStore';
import { AlternativesBox } from './AlternativesBox';
import { BufferedInput, ConfirmDeleteButton, DrawerHead, Segmented } from './parts';
import { PaymentBox } from './PaymentBox';
import { PhotoField } from './PhotoField';

export function ItemInspector({ id }: { id: string }) {
  const it = useAppStore((s) => s.board.items[id]);
  const groups = useAppStore((s) => s.board.groups);
  const room = useAppStore((s) => (s.board.items[id] ? roomOf(s.board, s.board.items[id]) : null));

  useEffect(() => {
    if (!it) closeDrawer();
  }, [it]);
  if (!it) return null;

  const set = (patch: Parameters<typeof updateItem>[1]) => updateItem(id, patch);

  return (
    <>
      <DrawerHead title="Eşya" />
      <div className="d-body">
        <fieldset>
          <div className="field">
            <PhotoField id={id} item={it} />
          </div>
          <label className="field">
            <span>Eşya adı</span>
            <input
              className="input"
              data-f="name"
              autoComplete="off"
              value={it.name ?? ''}
              onChange={(e) => set({ name: e.target.value })}
            />
          </label>
          <div className="row">
            <label className="field">
              <span>Birim fiyat (₺)</span>
              <BufferedInput
                className="input"
                data-f="price"
                inputMode="decimal"
                placeholder="0"
                value={it.price ? String(it.price).replace('.', ',') : ''}
                onValue={(v) => set({ price: parseNum(v) })}
              />
            </label>
            <label className="field" style={{ flex: 0.55 }}>
              <span>Adet</span>
              <BufferedInput
                className="input"
                data-f="qty"
                type="number"
                min={1}
                step={1}
                value={String(it.qty || 1)}
                onValue={(v) => set({ qty: Math.max(1, parseInt(v, 10) || 1) })}
              />
            </label>
          </div>
          <label className="field">
            <span>Mağaza</span>
            <input
              className="input"
              data-f="store"
              placeholder="Nereden alınacak?"
              value={it.store ?? ''}
              onChange={(e) => set({ store: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Ürün linki</span>
            <div className="linkrow">
              <input
                className="input"
                data-f="link"
                type="url"
                placeholder="https://"
                value={it.link ?? ''}
                onChange={(e) => set({ link: e.target.value })}
              />
              <a
                target="_blank"
                rel="noopener noreferrer"
                hidden={!isHttpUrl(it.link)}
                href={isHttpUrl(it.link) ? it.link : undefined}
              >
                Aç
              </a>
            </div>
          </label>
          <div className="field">
            <span className="legend">Satın alma durumu</span>
            <Segmented
              field="status"
              options={STATUS}
              value={it.status}
              onChange={(v) => setItemStatus(id, v)}
            />
          </div>
          <PaymentBox id={id} item={it} />
          <div className="deliv-box" hidden={it.status !== 'bought'}>
            <span className="legend">Teslimat</span>
            <Segmented
              field="delivery"
              options={DELIV_SHORT}
              value={it.delivery || 'pending'}
              onChange={(v) => setItemDelivery(id, v)}
            />
            <label className="field">
              <span>Teslim tarihi</span>
              <input
                className="input"
                data-f="deliveryDate"
                type="date"
                value={it.deliveryDate ?? ''}
                onChange={(e) => set({ deliveryDate: e.target.value })}
              />
            </label>
          </div>
          <div className="field">
            <span className="legend">Öncelik</span>
            <Segmented
              field="priority"
              options={PRI}
              value={it.priority || 'normal'}
              onChange={(v) => setItemPriority(id, v)}
            />
          </div>
          <label className="field">
            <span>Oda</span>
            <select
              className="input"
              data-f="room"
              value={room || ''}
              onChange={(e) => moveItemToRoom(id, e.target.value)}
            >
              <option value="">Odasız</option>
              {Object.entries(groups).map(([gid, g]) => (
                <option key={gid} value={gid}>
                  {g.name || 'İsimsiz oda'}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Not</span>
            <textarea
              className="input"
              data-f="note"
              placeholder="Ölçü, renk, model…"
              value={it.note ?? ''}
              onChange={(e) => set({ note: e.target.value })}
            />
          </label>
          <AlternativesBox id={id} />
          <div className="d-foot">
            <ConfirmDeleteButton label="Eşyayı sil" onConfirm={() => deleteSelectedItem(id)} />
          </div>
        </fieldset>
      </div>
    </>
  );
}
