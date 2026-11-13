import { useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';

export function Toast() {
  const toast = useAppStore((s) => s.toast);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const t = setTimeout(() => setVisible(false), toast.action ? 6000 : 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const hasAct = !!toast?.action;
  return (
    <div className={'toast' + (visible ? ' show' : '') + (hasAct ? ' has-act' : '')} role="status">
      {toast?.msg}
      {toast?.action && (
        <button
          className="toast-act"
          onClick={() => {
            setVisible(false);
            toast.action!.run();
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
