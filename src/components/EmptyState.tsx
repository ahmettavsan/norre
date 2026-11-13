import type { CSSProperties } from 'react';
import { startBlank, startFromTemplate } from '../store/actions';
import { useAppStore } from '../store/appStore';

const noteStyle = (color: string): CSSProperties => ({
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 0 0 1px rgba(0,0,0,.04),0 6px 18px -4px rgba(0,0,0,.14)',
  borderBottom: `5px solid ${color}`,
});

export function EmptyState() {
  const hidden = useAppStore(
    (s) => s.blank || Object.keys(s.board.groups).length > 0 || Object.keys(s.board.items).length > 0,
  );
  return (
    <div className="empty" hidden={hidden}>
      <div className="empty-card">
        <div className="empty-notes" aria-hidden="true">
          <span style={noteStyle('var(--status-todo)')}>Koltuk</span>
          <span style={noteStyle('var(--status-looking)')}>Halı</span>
          <span style={noteStyle('var(--status-bought)')}>Buzdolabı</span>
        </div>
        <h1>Yeni evimiz</h1>
        <svg className="uline" viewBox="0 0 240 14" preserveAspectRatio="none" aria-hidden="true">
          <path d="M3 9 C 50 3, 110 12, 160 6 S 225 4, 237 8" />
        </svg>
        <p>
          Her oda için bir alan çizin, alacağınız eşyaları yapışkan not olarak içine bırakın. Kartlardaki sarı
          etiket alınacak, pembe bakılıyor, yeşil alındı demek. Ürün fotoğraflarını panoya sürükleyip
          bırakabilirsin.
        </p>
        <div className="actions">
          <button className="btn primary" onClick={() => void startFromTemplate()}>
            Örnek odalarla başla
          </button>
          <button className="btn" onClick={startBlank}>
            Boş panoyla başla
          </button>
        </div>
      </div>
    </div>
  );
}
