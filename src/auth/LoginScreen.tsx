import { useState, type FormEvent, type ReactNode } from 'react';
import { Toast } from '../components/Toast';
import {
  authErrorMessage,
  sendPasswordReset,
  setNewPassword,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '../store/session';

type Mode = 'signIn' | 'signUp' | 'forgot';

const GoogleMark = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.95l3.66-2.84Z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
    />
  </svg>
);

function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="auth">
      <div className="auth-card">
        <div className="auth-brand">norre</div>
        <p className="auth-tag">Yeni evin için alınacakları oda oda planla</p>
        <h1>{title}</h1>
        {children}
      </div>
      <Toast />
    </main>
  );
}

/** Sign in, sign up and "forgot password", with Google or email and password. */
export function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const go = (m: Mode) => {
    setMode(m);
    setError('');
    setInfo('');
  };

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setInfo('');
    try {
      await task();
    } catch {
      setError('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.');
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      if (mode === 'signIn') {
        const err = await signInWithEmail(email.trim(), password);
        if (err) setError(authErrorMessage(err));
      } else if (mode === 'signUp') {
        const { error: err, confirm } = await signUpWithEmail(email.trim(), password);
        if (err) setError(authErrorMessage(err));
        else if (confirm)
          setInfo('Hesabın oluşturuldu. E-postana gelen bağlantıya tıklayıp hesabını onayla.');
      } else {
        const err = await sendPasswordReset(email.trim());
        if (err) setError(authErrorMessage(err));
        else setInfo('Şifreni yenilemen için e-postana bir bağlantı gönderdik.');
      }
    });
  };

  const google = () =>
    void run(async () => {
      const err = await signInWithGoogle();
      if (err) setError(typeof err === 'string' ? err : authErrorMessage(err));
    });

  const title = mode === 'signIn' ? 'Giriş yap' : mode === 'signUp' ? 'Hesap oluştur' : 'Şifreni yenile';

  return (
    <AuthCard title={title}>
      {mode !== 'forgot' && (
        <>
          <button type="button" className="btn auth-google" onClick={google} disabled={busy}>
            <GoogleMark />
            Google ile devam et
          </button>
          <div className="auth-or">ya da</div>
        </>
      )}
      <form onSubmit={onSubmit}>
        <label className="field">
          <span>E-posta</span>
          <input
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {mode !== 'forgot' && (
          <label className="field">
            <span>Şifre</span>
            <input
              className="input"
              type="password"
              autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {mode === 'signIn' && (
          <button type="button" className="auth-link auth-forgot" onClick={() => go('forgot')}>
            Şifremi unuttum
          </button>
        )}
        {error && (
          <p className="auth-msg error" role="alert">
            {error}
          </p>
        )}
        {info && (
          <p className="auth-msg" role="status">
            {info}
          </p>
        )}
        <button type="submit" className="btn primary auth-submit" disabled={busy}>
          {mode === 'signIn' ? 'Giriş yap' : mode === 'signUp' ? 'Hesap oluştur' : 'Bağlantı gönder'}
        </button>
      </form>
      <p className="auth-switch">
        {mode === 'signIn' ? (
          <>
            Hesabın yok mu?{' '}
            <button type="button" className="auth-link" onClick={() => go('signUp')}>
              Kayıt ol
            </button>
          </>
        ) : (
          <>
            {mode === 'signUp' ? 'Zaten hesabın var mı? ' : ''}
            <button type="button" className="auth-link" onClick={() => go('signIn')}>
              {mode === 'signUp' ? 'Giriş yap' : 'Girişe dön'}
            </button>
          </>
        )}
      </p>
    </AuthCard>
  );
}

/** Shown after following a password reset link. */
export function NewPasswordScreen() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNewPassword(password)
      .then((err) => err && setError(authErrorMessage(err)))
      .catch(() => setError('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.'))
      .finally(() => setBusy(false));
  };

  return (
    <AuthCard title="Yeni şifreni belirle">
      <form onSubmit={onSubmit}>
        <label className="field">
          <span>Yeni şifre</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="auth-msg error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn primary auth-submit" disabled={busy}>
          Şifreyi kaydet
        </button>
      </form>
    </AuthCard>
  );
}
