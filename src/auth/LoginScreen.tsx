import { useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import kivik from '../assets/ikea/49440597.jpg';
import lack from '../assets/ikea/90449905.jpg';
import poang from '../assets/ikea/29502039.jpg';
import { DeliveryIcon, HomeIcon, StatusIcon } from '../components/icons';
import { CHIPS, DELIV_SHORT, STATUS } from '../domain/constants';
import { fmt } from '../domain/format';
import { Spinner } from '../components/Spinner';
import { Toast } from '../components/Toast';
import { closeAuth } from '../store/actions';
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

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What is wrong with the email field, or '' when it is fine. */
function emailProblem(email: string): string {
  const v = email.trim();
  if (!v) return 'E-posta adresini yaz.';
  if (!EMAIL_FORMAT.test(v)) return 'Geçerli bir e-posta adresi gir.';
  return '';
}

/** What is wrong with the password field; a new password needs at least 6 characters (Supabase's minimum). */
function passwordProblem(password: string, isNew: boolean): string {
  if (!password) return isNew ? 'Bir şifre belirle.' : 'Şifreni yaz.';
  if (isNew && password.length < 6) return 'Şifre en az 6 karakter olmalı.';
  return '';
}

/** The form's messages under the fields: what to fix in the fields, otherwise what the server said. */
function FormError({ problems, error }: { problems: string[]; error: string }) {
  const lines = problems.length ? problems : error ? [error] : [];
  if (!lines.length) return null;
  return (
    <div className="auth-msg error" role="alert">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

const SWOOSH = 'M2 9 C 40 3, 90 12, 130 6 S 185 4, 198 8';

/** A few cards from a sample board around the form, drawn exactly like the cards on the board. */
function SceneCards() {
  const cards = [
    { img: kivik, name: "KIVIK 3'lü kanepe", price: 27999, status: 'looking' as const },
    { img: poang, name: 'POÄNG sallanan koltuk', price: 11199, status: 'bought' as const },
    { img: lack, name: 'LACK orta sehpa', price: 1299, status: 'todo' as const },
  ];
  return (
    <div className="auth-cards" aria-hidden="true">
      {cards.map((c) => (
        <div
          key={c.name}
          className={`tag has-img s-${c.status} d-${c.status === 'bought' ? 'delivered' : 'none'}`}
        >
          <div className="t-img">
            <img src={c.img} alt="" draggable={false} />
          </div>
          <div className="t-name">{c.name}</div>
          <div className="t-price">{fmt(c.price)}</div>
          <div className="t-foot">
            <span className="pill-btn" data-act="status">
              <StatusIcon status={c.status} />
              {STATUS[c.status]}
            </span>
            {c.status === 'bought' && (
              <span className="pill-btn dv-delivered">
                <DeliveryIcon delivery="delivered" />
                {DELIV_SHORT.delivered}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The frame of the sign-in screens: the form sits on the whiteboard like a room, with its title written
 * by hand and underlined in a room colour, and a few cards from a sample board around it.
 */
export function AuthFrame({
  title,
  tagline = 'Yeni evin için alınacakları oda oda planla',
  color = CHIPS[0],
  cards = false,
  children,
}: {
  title: string;
  tagline?: string;
  color?: string;
  cards?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="auth">
      <div className="auth-top">
        <HomeIcon />
        <span className="title">nook</span>
      </div>
      <div className="auth-scene">
        {cards && <SceneCards />}
        <section className="auth-room" style={{ '--chip': color } as CSSProperties}>
          <h1 className="auth-title">
            {title}
            <svg className="swoosh" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true">
              <path d={SWOOSH} />
            </svg>
          </h1>
          <p className="auth-tag">{tagline}</p>
          {children}
        </section>
      </div>
      <Toast />
    </main>
  );
}

/** Sign in, sign up and "forgot password", with Google or email and password, opened over the board. */
export function LoginScreen({ initial }: { initial: 'signIn' | 'signUp' }) {
  const [mode, setMode] = useState<Mode>(initial);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Which button is waiting for Supabase, if any.
  const [busy, setBusy] = useState<'' | 'google' | 'form'>('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  // Fields are checked once the form has been sent, and then again as they are corrected.
  const [checked, setChecked] = useState(false);

  const emailError = checked ? emailProblem(email) : '';
  const passwordError = checked && mode !== 'forgot' ? passwordProblem(password, mode === 'signUp') : '';

  const go = (m: Mode) => {
    setMode(m);
    setError('');
    setInfo('');
    setChecked(false);
  };

  const run = async (by: 'google' | 'form', task: () => Promise<void>) => {
    setBusy(by);
    setError('');
    setInfo('');
    try {
      await task();
    } catch {
      setError('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.');
    } finally {
      setBusy('');
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setChecked(true);
    if (emailProblem(email) || (mode !== 'forgot' && passwordProblem(password, mode === 'signUp'))) {
      // Put the cursor in the first field to fix.
      const field = emailProblem(email) ? 'email' : 'password';
      e.currentTarget.querySelector<HTMLInputElement>(`input[type=${field}]`)?.focus();
      setError('');
      setInfo('');
      return;
    }
    void run('form', async () => {
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
    void run('google', async () => {
      const err = await signInWithGoogle();
      if (err) setError(typeof err === 'string' ? err : authErrorMessage(err));
    });

  const title = mode === 'signIn' ? 'Giriş yap' : mode === 'signUp' ? 'Hesap oluştur' : 'Şifreni yenile';
  // Each step underlines its title in another room colour, like rooms on the board.
  const color = mode === 'signIn' ? CHIPS[0] : mode === 'signUp' ? CHIPS[1] : CHIPS[2];

  return (
    <AuthFrame
      title={title}
      tagline={mode === 'signUp' ? 'Panon hesabına taşınır, her cihazdan açabilirsin' : undefined}
      color={color}
      cards
    >
      {mode !== 'forgot' && (
        <>
          <button type="button" className="btn auth-google" onClick={google} disabled={!!busy}>
            {busy === 'google' ? <Spinner px={3} /> : <GoogleMark />}
            Google ile devam et
          </button>
          <div className="auth-or">ya da</div>
        </>
      )}
      <form onSubmit={onSubmit} noValidate>
        <label className="field">
          <span>E-posta</span>
          <input
            className={emailError ? 'input invalid' : 'input'}
            aria-invalid={!!emailError}
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
              className={passwordError ? 'input invalid' : 'input'}
              aria-invalid={!!passwordError}
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
        <FormError problems={[emailError, passwordError].filter(Boolean)} error={error} />
        {info && (
          <p className="auth-msg" role="status">
            {info}
          </p>
        )}
        <button type="submit" className="btn primary auth-submit" disabled={!!busy}>
          {busy === 'form' && <Spinner px={3} />}
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
      <p className="auth-switch auth-back">
        <button type="button" className="auth-link" onClick={closeAuth}>
          Kayıt olmadan devam et
        </button>
      </p>
    </AuthFrame>
  );
}

/** Shown after following a password reset link. */
export function NewPasswordScreen() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState(false);
  const passwordError = checked ? passwordProblem(password, true) : '';

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setChecked(true);
    if (passwordProblem(password, true)) {
      e.currentTarget.querySelector('input')?.focus();
      setError('');
      return;
    }
    setBusy(true);
    setError('');
    setNewPassword(password)
      .then((err) => err && setError(authErrorMessage(err)))
      .catch(() => setError('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.'))
      .finally(() => setBusy(false));
  };

  return (
    <AuthFrame title="Yeni şifre" color={CHIPS[3]}>
      <form onSubmit={onSubmit} noValidate>
        <label className="field">
          <span>Yeni şifre</span>
          <input
            className={passwordError ? 'input invalid' : 'input'}
            aria-invalid={!!passwordError}
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <FormError problems={passwordError ? [passwordError] : []} error={error} />
        <button type="submit" className="btn primary auth-submit" disabled={busy}>
          {busy && <Spinner px={3} />}
          Şifreyi kaydet
        </button>
      </form>
    </AuthFrame>
  );
}
