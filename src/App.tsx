import { LoginScreen, NewPasswordScreen } from './auth/LoginScreen';
import { Canvas } from './canvas/Canvas';
import { Topbar } from './components/Topbar';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useAppStore } from './store/appStore';
import { openBoard, signOut } from './store/session';

function Board() {
  useGlobalShortcuts();
  return (
    <>
      <Topbar />
      <Canvas />
    </>
  );
}

function Waiting({ text }: { text?: string }) {
  return (
    <main className="auth">
      <div className="auth-brand">norre</div>
      {text && <p className="auth-tag">{text}</p>}
    </main>
  );
}

function BoardError() {
  return (
    <main className="auth">
      <div className="auth-card">
        <div className="auth-brand">norre</div>
        <h1>Panon açılamadı</h1>
        <p className="auth-tag">Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.</p>
        <button type="button" className="btn primary auth-submit" onClick={() => void openBoard()}>
          Tekrar dene
        </button>
        <p className="auth-switch">
          <button type="button" className="auth-link" onClick={() => void signOut()}>
            Çıkış yap
          </button>
        </p>
      </div>
    </main>
  );
}

export function App() {
  const authStatus = useAppStore((s) => s.authStatus);
  const recovery = useAppStore((s) => s.recovery);
  const boardStatus = useAppStore((s) => s.boardStatus);

  if (authStatus === 'loading') return <Waiting />;
  if (authStatus === 'signedOut') return <LoginScreen />;
  if (recovery) return <NewPasswordScreen />;
  if (boardStatus === 'error') return <BoardError />;
  if (boardStatus !== 'ready') return <Waiting text="Panon açılıyor…" />;
  return <Board />;
}
