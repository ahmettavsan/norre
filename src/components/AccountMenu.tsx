import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { signOut } from '../store/session';

/** The signed-in user's initial; opens a menu with their email and "Çıkış yap". */
export function AccountMenu() {
  const email = useAppStore((s) => s.user?.email || '');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close, true);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <div className="account" ref={ref}>
      <button
        type="button"
        className="tbtn account-btn"
        aria-label="Hesap"
        aria-expanded={open}
        title={email}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="avatar">{(email[0] || '?').toUpperCase()}</span>
      </button>
      {open && (
        <div className="account-menu glass" role="menu">
          <div className="account-email">{email}</div>
          <button type="button" role="menuitem" onClick={() => void signOut()}>
            Çıkış yap
          </button>
        </div>
      )}
    </div>
  );
}
