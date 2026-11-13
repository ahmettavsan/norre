import { useAppStore } from '../store/appStore';
import { fitAll, zoomCenter } from '../store/viewActions';

export function ZoomControls() {
  const k = useAppStore((s) => s.view.k);
  return (
    <div className="zoom glass">
      <button title="Uzaklaştır" aria-label="Uzaklaştır" onClick={() => zoomCenter(1 / 1.2)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12h14" />
        </svg>
      </button>
      <span>{Math.round(k * 100)}%</span>
      <button title="Yakınlaştır" aria-label="Yakınlaştır" onClick={() => zoomCenter(1.2)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <button title="Tümünü göster (Shift+1)" aria-label="Tümünü göster" onClick={fitAll}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        </svg>
      </button>
    </div>
  );
}
