import { AuthFrame, LoginScreen, NewPasswordScreen } from './auth/LoginScreen';
import { Canvas } from './canvas/Canvas';
import { HomeIcon } from './components/icons';
import { Spinner } from './components/Spinner';
import { Topbar } from './components/Topbar';
import { CHIPS } from './domain/constants';
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

function Waiting({ label }: { label?: string }) {
  return (
    <main className="auth">
      <div className="auth-top">
        <HomeIcon />
        <span className="title">nook</span>
      </div>
      <div className="auth-wait">
        <Spinner px={8} label={label} />
      </div>
    </main>
  );
}

function BoardError() {
  return (
    <AuthFrame title="Panon açılamadı" color={CHIPS[6]}>
      <p className="auth-msg">Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.</p>
      <button type="button" className="btn primary auth-submit" onClick={() => void openBoard()}>
        Tekrar dene
      </button>
      <p className="auth-switch">
        <button type="button" className="auth-link" onClick={() => void signOut()}>
          Çıkış yap
        </button>
      </p>
    </AuthFrame>
  );
}

export function App() {
  const authStatus = useAppStore((s) => s.authStatus);
  const authScreen = useAppStore((s) => s.authScreen);
  const recovery = useAppStore((s) => s.recovery);
  const boardStatus = useAppStore((s) => s.boardStatus);

  if (authStatus === 'loading') return <Waiting />;
  if (recovery) return <NewPasswordScreen />;
  if (authStatus === 'signedOut' && authScreen) return <LoginScreen initial={authScreen} />;
  if (boardStatus === 'error') return <BoardError />;
  if (boardStatus !== 'ready') return <Waiting label="Panon açılıyor" />;
  return <Board />;
}
