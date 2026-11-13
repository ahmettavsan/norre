import { useEffect, useRef, type DragEvent } from 'react';
import { attachPhoto } from '../../store/actions';
import { getState, useAppStore } from '../../store/appStore';
import { ItemInspector } from './ItemInspector';
import { RoomInspector } from './RoomInspector';
import { SummaryPanel } from './SummaryPanel';

/** The floating inspector on the right (bottom sheet on phones). */
export function Drawer() {
  const drawer = useAppStore((s) => s.drawer);
  const ref = useRef<HTMLElement>(null);

  // Focus the requested field each time the drawer is (re)opened.
  useEffect(() => {
    if (!drawer?.focus) return;
    const f = ref.current?.querySelector<HTMLInputElement>(`[data-f="${drawer.focus}"]`);
    if (f) {
      f.focus();
      f.select?.();
    }
  }, [drawer?.seq, drawer?.focus]);

  const onDrop = (e: DragEvent) => {
    const f = e.dataTransfer.files[0];
    const d = getState().drawer;
    if (!f || d?.type !== 'item' || !d.id) return;
    e.preventDefault();
    e.stopPropagation();
    void attachPhoto(d.id, f);
  };

  return (
    <aside ref={ref} className="drawer glass" hidden={!drawer} aria-live="polite" onDrop={onDrop}>
      {drawer?.type === 'item' && drawer.id && <ItemInspector key={drawer.seq} id={drawer.id} />}
      {drawer?.type === 'group' && drawer.id && <RoomInspector key={drawer.seq} id={drawer.id} />}
      {drawer?.type === 'summary' && <SummaryPanel key={drawer.seq} />}
    </aside>
  );
}
