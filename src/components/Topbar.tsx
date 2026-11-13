import type { Tool } from '../domain/types';
import { setTool, tidyAll, toggleSummary } from '../store/actions';
import { useAppStore } from '../store/appStore';
import { AccountMenu } from './AccountMenu';
import { HomeIcon } from './icons';

function ToolButton({
  tool,
  title,
  label,
  className = 'tbtn',
  children,
}: {
  tool: Tool;
  title: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const active = useAppStore((s) => s.tool === tool);
  return (
    <button
      className={className}
      aria-pressed={active}
      title={title}
      aria-label={label}
      onClick={() => setTool(tool)}
    >
      {children}
    </button>
  );
}

const SAVE_LABEL = {
  saved: 'Kaydedildi',
  saving: 'Kaydediliyor…',
  error: 'Kaydedilemedi, tekrar denenecek',
};

/** A small dot next to the name: green once the board is saved, grey while saving, red when it failed. */
function SaveStatus() {
  const status = useAppStore((s) => s.saveStatus);
  return <span className={'sync ' + status} title={SAVE_LABEL[status]} aria-label={SAVE_LABEL[status]} />;
}

export function Topbar() {
  return (
    <header className="topbar">
      <div className="tb-left">
        <HomeIcon />
        <span className="title">norre</span>
        <SaveStatus />
      </div>
      <div className="tb-center" role="toolbar" aria-label="Araçlar">
        <ToolButton tool="select" title="Seç ve taşı (V)" label="Seç">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
            <path d="M6 3.5 18.5 10l-5.6 1.9-2 5.6z" />
          </svg>
        </ToolButton>
        <ToolButton tool="hand" title="Kaydır (H)" label="Kaydır">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8" />
            <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15" />
          </svg>
        </ToolButton>
        <span className="tsep edit-tool" />
        <ToolButton tool="item" className="tbtn edit-tool" title="Yapışkan not ekle (N)" label="Eşya ekle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
            <path d="M4 4h16v10.5L14.5 20H4z" />
            <path d="M14.5 20v-5.5H20" />
          </svg>
        </ToolButton>
        <ToolButton tool="room" className="tbtn edit-tool" title="Oda çiz (R)" label="Oda ekle">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeDasharray="3 2.4"
          >
            <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
          </svg>
        </ToolButton>
        <span className="tsep" />
        <button
          className="tbtn edit-tool"
          title="Kartları odalara düzgünce diz ve ekrana sığdır"
          aria-label="Düzenle"
          onClick={tidyAll}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
            <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
            <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
            <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
            <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
          </svg>
          <span className="tlabel">Düzenle</span>
        </button>
      </div>
      <div className="tb-right">
        <button className="tbtn" title="Özet ve bütçe" aria-label="Özet" onClick={toggleSummary}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 3.5V12l6 6" />
          </svg>
        </button>
        <AccountMenu />
      </div>
    </header>
  );
}
