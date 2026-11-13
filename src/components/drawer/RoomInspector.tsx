import { useEffect } from 'react';
import { CHIPS } from '../../domain/constants';
import { fmt } from '../../domain/format';
import { useBoardStats } from '../../hooks/useBoardDerived';
import { closeDrawer, createItemInRoom, removeGroup, toast, updateGroup } from '../../store/actions';
import { useAppStore } from '../../store/appStore';
import { ConfirmDeleteButton, DrawerHead } from './parts';

export function RoomInspector({ id }: { id: string }) {
  const g = useAppStore((s) => s.board.groups[id]);
  const s = useBoardStats().rooms.get(id) || { n: 0, done: 0, sum: 0 };

  useEffect(() => {
    if (!g) closeDrawer();
  }, [g]);
  if (!g) return null;

  return (
    <>
      <DrawerHead title="Oda" />
      <div className="d-body">
        <fieldset>
          <label className="field">
            <span>Oda adı</span>
            <input
              className="input"
              data-f="gname"
              autoComplete="off"
              value={g.name ?? ''}
              onChange={(e) => updateGroup(id, { name: e.target.value })}
            />
          </label>
          <div className="field">
            <span className="legend">Renk</span>
            <div className="swatches">
              {CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  style={{ background: c }}
                  aria-label={`Renk ${c}`}
                  aria-pressed={g.color === c}
                  onClick={() => updateGroup(id, { color: c })}
                />
              ))}
            </div>
          </div>
          <p className="note">
            {s.n ? `${s.n} eşya, ${s.done} tanesi alındı. Toplam ${fmt(s.sum)}.` : 'Bu odada henüz eşya yok.'}
          </p>
          <div className="d-foot">
            <button className="btn primary" onClick={() => createItemInRoom(id)}>
              Bu odaya eşya ekle
            </button>
            <ConfirmDeleteButton
              label="Odayı sil"
              onConfirm={() => {
                removeGroup(id);
                toast('Oda silindi.');
                closeDrawer();
              }}
            />
          </div>
          <p className="note">Odayı silmek içindeki eşyaları silmez; eşyalar panoda kalır.</p>
        </fieldset>
      </div>
    </>
  );
}
