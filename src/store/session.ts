import type { AuthError, Session } from '@supabase/supabase-js';
import { emptyBoard } from '../domain/board';
import { supabase } from '../lib/supabase';
import { toast } from './actions';
import { getState, setState, useAppStore } from './appStore';
import { fetchBoard, resetCloud, storeBoard } from './cloud';
import { clearLocalBoard, takeLocalBoard } from './persistence';

/* Signing in and out, loading the user's board and saving it while they work. */

/** Where links in auth emails and the Google sign-in come back to: this page, without its query. */
const returnUrl = () => window.location.origin + window.location.pathname;

/* ---------- saving ---------- */

const SAVE_DELAY = 1000;
const RETRY_DELAY = 5000;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let saving: Promise<void> | null = null;
/** The board changed since it was last saved. */
let dirty = false;

function scheduleSave(delay = SAVE_DELAY): void {
  dirty = true;
  if (getState().saveStatus === 'saved') setState({ saveStatus: 'saving' });
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void flushSave(), delay);
}

/** Saves now if anything changed, after any save already running. */
export async function flushSave(): Promise<void> {
  clearTimeout(saveTimer);
  if (saving) await saving;
  const { user, board } = getState();
  if (!dirty || !user) return;
  dirty = false;
  setState({ saveStatus: 'saving' });
  saving = storeBoard(user.id, board)
    .then(
      () => {
        if (!dirty) setState({ saveStatus: 'saved' });
      },
      (err) => {
        console.error('Saving the board failed', err);
        if (getState().saveStatus !== 'error')
          toast('Pano kaydedilemedi. Bağlantı gelince tekrar denenecek.');
        setState({ saveStatus: 'error' });
        scheduleSave(RETRY_DELAY);
      },
    )
    .finally(() => {
      saving = null;
    });
  await saving;
}

// Save the board whenever it changes after it has been loaded.
useAppStore.subscribe((s, prev) => {
  if (s.board !== prev.board && s.boardStatus === 'ready' && prev.boardStatus === 'ready' && s.user)
    scheduleSave();
});

if (typeof window !== 'undefined') {
  // Ask before closing the page while changes are not saved yet.
  window.addEventListener('beforeunload', (e) => {
    if (dirty || saving) e.preventDefault();
  });
  window.addEventListener('pagehide', () => void flushSave());
}

/* ---------- loading ---------- */

/** Opens the signed-in user's board. On their first sign-in, the board this browser kept comes along. */
export async function openBoard(): Promise<void> {
  const { user } = getState();
  if (!user) return;
  setState({ boardStatus: 'loading' });
  try {
    const saved = await fetchBoard(user.id);
    if (getState().user?.id !== user.id) return; // signed out meanwhile
    if (saved) {
      setState({ board: saved, boardStatus: 'ready', saveStatus: 'saved' });
      return;
    }
    const local = takeLocalBoard();
    setState({ board: local || emptyBoard(), boardStatus: 'ready' });
    if (local) {
      dirty = true;
      await flushSave();
      if (getState().saveStatus === 'saved') clearLocalBoard();
    }
  } catch (err) {
    console.error('Loading the board failed', err);
    setState({ boardStatus: 'error' });
  }
}

/* ---------- auth ---------- */

/** Everything the previous user had open, cleared so the next one starts fresh. */
const signedOutState = {
  user: null,
  recovery: false,
  boardStatus: 'idle',
  saveStatus: 'saved',
  board: emptyBoard(),
  view: { x: 40, y: 40, k: 1 },
  tool: 'select',
  filter: 'all',
  drawer: null,
  blank: false,
  quickPay: null,
  compare: null,
  clipDraft: null,
  clipCursor: null,
  selectedClip: null,
  toast: null,
} as const;

function applySession(session: Session | null): void {
  const prev = getState().user;
  if (!session) {
    resetCloud();
    dirty = false;
    setState({ ...signedOutState, authStatus: 'signedOut' });
    return;
  }
  const user = { id: session.user.id, email: session.user.email || '' };
  if (prev?.id === user.id) return;
  setState({ authStatus: 'signedIn', user });
  void openBoard();
}

/** Starts listening to Supabase auth. Call once when the app starts. */
export function startSession(): void {
  const params = new URLSearchParams(window.location.search);
  const resetting = params.has('reset');
  const linkError = params.has('error_description');

  supabase.auth.onAuthStateChange((event, session) => {
    // Supabase calls must not run inside this callback, so react right after it.
    setTimeout(() => {
      if (event === 'INITIAL_SESSION') {
        // Supabase has read the auth link by now: drop it from the address so a reload does not repeat it.
        if (params.has('code') || resetting || linkError) {
          for (const k of ['code', 'reset', 'error', 'error_code', 'error_description']) params.delete(k);
          const q = params.toString();
          window.history.replaceState(
            null,
            '',
            window.location.pathname + (q ? '?' + q : '') + window.location.hash,
          );
        }
      }
      if (event === 'PASSWORD_RECOVERY' || (resetting && session && event === 'INITIAL_SESSION'))
        setState({ recovery: true });
      applySession(session);
      if (event === 'INITIAL_SESSION' && linkError) toast('Bağlantı geçersiz ya da süresi dolmuş.');
    }, 0);
  });
}

export async function signOut(): Promise<void> {
  await flushSave();
  await supabase.auth.signOut();
}

/* ---------- auth forms ---------- */

/** Whether Google sign-in is switched on in the Supabase project (otherwise its redirect ends on an error page). */
async function googleEnabled(): Promise<boolean> {
  const res = await fetch(import.meta.env.VITE_SUPABASE_URL + '/auth/v1/settings', {
    headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
  });
  const settings = (await res.json()) as { external?: { google?: boolean } };
  return !!settings.external?.google;
}

export async function signInWithGoogle(): Promise<AuthError | string | null> {
  if (!(await googleEnabled()))
    return 'Google ile giriş henüz açılmadı. Şimdilik e-posta ve şifreyle devam et.';
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: returnUrl() },
  });
  return error;
}

export async function signInWithEmail(email: string, password: string): Promise<AuthError | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error;
}

/** Creates an account. `confirm` is true when the user has to click the link in their email first. */
export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<{ error: AuthError | null; confirm: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: returnUrl() },
  });
  return { error, confirm: !error && !data.session };
}

export async function sendPasswordReset(email: string): Promise<AuthError | null> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: returnUrl() + '?reset=1',
  });
  return error;
}

export async function setNewPassword(password: string): Promise<AuthError | null> {
  const { error } = await supabase.auth.updateUser({ password });
  if (!error) setState({ recovery: false });
  return error;
}

/** A Turkish message for what went wrong. */
export function authErrorMessage(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return 'E-posta ya da şifre hatalı.';
    case 'email_not_confirmed':
      return 'E-postanı henüz onaylamadın. Gelen kutundaki bağlantıya tıkla.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Bu e-postayla zaten bir hesap var. Giriş yapmayı dene.';
    case 'weak_password':
      return 'Şifre çok zayıf. En az 6 karakter kullan.';
    case 'same_password':
      return 'Yeni şifre eskisiyle aynı olamaz.';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'Geçerli bir e-posta adresi gir.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.';
    case 'signup_disabled':
      return 'Şu an yeni hesap açılamıyor.';
    default:
      return 'Bir şeyler ters gitti. Tekrar dene.';
  }
}
