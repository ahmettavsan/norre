import { useEffect } from 'react';
import { CARD_H, CARD_W } from '../domain/constants';
import { isImageFile } from '../lib/image';
import {
  attachPhoto,
  cancelClip,
  closeCompare,
  closeDrawer,
  closeQuickPay,
  createItemAt,
  deleteClip,
  deleteSelectedItem,
  openDrawer,
  selectClip,
  setTool,
  startClip,
} from '../store/actions';
import { getState, selectedId, setState } from '../store/appStore';
import { redo, undo } from '../store/history';
import { fitAll, toWorld, viewportRect, zoomCenter } from '../store/viewActions';

const isTyping = (t: EventTarget | null) => t instanceof Element && !!t.closest('input,textarea,select');

/** Keyboard shortcuts (V, H, N, R, +, -, Shift+1, ⌘Z, ⇧⌘Z, ⌘X, Delete, Esc, Space-to-pan) and pasting images. */
export function useGlobalShortcuts(): void {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const typing = isTyping(e.target);
      if (e.key === 'Escape') {
        if (typing) (e.target as HTMLElement).blur();
        closeQuickPay();
        closeCompare();
        cancelClip();
        selectClip(null);
        closeDrawer();
        setTool('select');
        return;
      }
      if (typing) return;
      if (e.code === 'Space') {
        setState({ spacePan: true });
        e.preventDefault();
        return;
      }
      if (e.metaKey || e.ctrlKey) {
        // ⌘Z / Ctrl+Z undoes; ⇧⌘Z / Ctrl+Shift+Z / Ctrl+Y redoes. Inside a text field the field's own undo runs.
        const key = e.key.toLowerCase();
        if (key === 'z' || (key === 'y' && e.ctrlKey)) {
          e.preventDefault();
          if (key === 'y' || e.shiftKey) redo();
          else undo();
          return;
        }
        // ⌘X / Ctrl+X on the selected card cuts its photo out (the card itself stays).
        const { drawer } = getState();
        if (e.key.toLowerCase() === 'x' && drawer?.type === 'item' && drawer.id) {
          e.preventDefault();
          void startClip(drawer.id);
        }
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'v') setTool('select');
      else if (k === 'h') setTool('hand');
      else if (k === 'r') setTool('room');
      else if (k === 'n') setTool('item');
      else if (e.key === '+' || e.key === '=') zoomCenter(1.2);
      else if (e.key === '-') zoomCenter(1 / 1.2);
      else if (e.key === '!' || (e.shiftKey && e.code === 'Digit1')) fitAll();
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        const s = getState();
        const id = selectedId(s);
        if (s.selectedClip) deleteClip(s.selectedClip);
        else if (id && s.drawer?.type === 'item') deleteSelectedItem(id);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') setState({ spacePan: false });
    }

    // The Space keyup never arrives when the window loses focus while it is held.
    const onBlur = () => setState({ spacePan: false });

    function onPaste(e: ClipboardEvent) {
      if (isTyping(e.target)) return;
      const f = [...(e.clipboardData?.files || [])].find(isImageFile);
      if (!f) return;
      e.preventDefault();
      const { drawer } = getState();
      if (drawer?.type === 'item' && drawer.id) {
        void attachPhoto(drawer.id, f);
        return;
      }
      const r = viewportRect();
      const w = toWorld(r.left + r.width / 2, r.top + r.height / 2);
      const id = createItemAt(w.x - CARD_W / 2, w.y - CARD_H / 2);
      setState({ blank: true });
      openDrawer('item', id, 'name');
      void attachPhoto(id, f);
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('paste', onPaste);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('paste', onPaste);
    };
  }, []);
}
