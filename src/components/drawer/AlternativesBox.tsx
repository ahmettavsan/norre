import { fmt, safeImg, total } from '../../domain/format';
import { STATUS } from '../../domain/constants';
import { stackOf } from '../../domain/stacks';
import { addAlternative, bringFront, detachFromStack, openDrawer } from '../../store/actions';
import { useAppStore } from '../../store/appStore';
import { CameraIcon } from '../icons';

export function AlternativesBox({ id }: { id: string }) {
  const board = useAppStore((s) => s.board);
  const st = stackOf(board, id);

  return (
    <div className="alt-box">
      <span className="legend">{st ? `Alternatifler (${st.ids.length} seçenek)` : 'Alternatifler'}</span>
      <div>
        {st ? (
          st.ids.map((i) => {
            const x = board.items[i];
            const t = total(x);
            return (
              <button
                key={i}
                type="button"
                className={'alt-row' + (i === id ? ' cur' : '')}
                onClick={() => {
                  bringFront(i);
                  openDrawer('item', i);
                }}
              >
                <span className="alt-thumb">
                  {safeImg(x.img) ? <img src={x.img} alt="" /> : <CameraIcon />}
                </span>
                <span className="alt-name">{x.name || 'İsimsiz eşya'}</span>
                <span
                  className="alt-dot"
                  style={{ background: `var(--status-${x.status})` }}
                  title={STATUS[x.status]}
                />
                <span className="alt-price">{t ? fmt(t) : ''}</span>
              </button>
            );
          })
        ) : (
          <p className="note" style={{ margin: '0 0 4px' }}>
            Aklında başka seçenekler de varsa ekle; panoda yan yana değil, tek bir kart yığını olarak
            dururlar. Bir kartı başka bir kartın üstüne sürükleyerek de yığın yapabilirsin.
          </p>
        )}
      </div>
      <div className="photo-acts">
        <button type="button" className="btn" onClick={() => addAlternative(id)}>
          Alternatif ekle
        </button>
        <button type="button" className="btn" hidden={!st} onClick={() => detachFromStack(id)}>
          Yığından çıkar
        </button>
      </div>
    </div>
  );
}
