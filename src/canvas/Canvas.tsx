import { useEffect, useRef, useState, type DragEvent } from 'react';
import { EmptyState } from '../components/EmptyState';
import { FilterPanel } from '../components/FilterPanel';
import { StatBar } from '../components/StatBar';
import { Toast } from '../components/Toast';
import { ZoomControls } from '../components/ZoomControls';
import { Drawer } from '../components/drawer/Drawer';
import { bounds } from '../domain/geometry';
import { addImageCards } from '../store/actions';
import { getState, useAppStore } from '../store/appStore';
import { fitAll, registerViewport, toWorld } from '../store/viewActions';
import { ClipToolbar } from './ClipToolbar';
import { ComparePopover } from './ComparePopover';
import { QuickPayPopover } from './QuickPayPopover';
import { useCanvasGestures } from './useCanvasGestures';
import { World } from './World';

const hasFiles = (e: DragEvent) => [...e.dataTransfer.types].includes('Files');

export function Canvas() {
  const ref = useRef<HTMLElement>(null);
  const [dropping, setDropping] = useState(false);
  const tool = useAppStore((s) => s.tool);
  const panning = useAppStore((s) => s.panning || s.spacePan);
  const hideUnmatched = useAppStore((s) => s.hideUnmatched);
  const placing = useAppStore((s) => !!s.clipDraft);

  useCanvasGestures(ref);

  useEffect(() => {
    registerViewport(ref.current);
    // Show the whole board on first load.
    if (bounds(getState().board)) requestAnimationFrame(fitAll);
    return () => registerViewport(null);
  }, []);

  const onDrop = (e: DragEvent) => {
    setDropping(false);
    if ((e.target as Element).closest('.drawer')) return;
    const files = [...e.dataTransfer.files].filter((f) => /^image\//.test(f.type));
    if (!files.length) return;
    e.preventDefault();
    addImageCards(files, toWorld(e.clientX, e.clientY));
  };

  const cls =
    'viewport' +
    (tool !== 'select' ? ' t-' + tool : '') +
    (panning ? ' panning' : '') +
    (dropping ? ' dropping' : '') +
    (hideUnmatched ? ' hide-unmatched' : '') +
    (placing ? ' placing' : '');

  return (
    <main
      ref={ref}
      className={cls}
      onDragOver={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDropping(true);
      }}
      onDragLeave={(e) => {
        if (e.target === e.currentTarget || !e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setDropping(false);
        }
      }}
      onDrop={onDrop}
    >
      <World />
      <FilterPanel />
      <EmptyState />
      <ZoomControls />
      <StatBar />
      <Drawer />
      <QuickPayPopover />
      <ComparePopover />
      <ClipToolbar />
      <Toast />
    </main>
  );
}
