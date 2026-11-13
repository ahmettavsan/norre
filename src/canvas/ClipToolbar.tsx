import { BringFrontIcon, FlipIcon, SendBackIcon, TrashIcon } from '../components/icons';
import { clipBounds } from '../domain/geometry';
import { clipToBack, clipToFront, deleteClip, flipClip } from '../store/actions';
import { useAppStore } from '../store/appStore';

/** Layer / mirror / delete buttons under the selected cut-out, drawn in screen space. */
export function ClipToolbar() {
  const id = useAppStore((s) => s.selectedClip);
  const clip = useAppStore((s) => (s.selectedClip ? s.board.clips[s.selectedClip] : undefined));
  const view = useAppStore((s) => s.view);
  const dragging = useAppStore((s) => s.panning);
  if (!id || !clip || dragging) return null;

  const b = clipBounds(clip);
  const left = view.x + ((b.x1 + b.x2) / 2) * view.k;
  const top = view.y + b.y2 * view.k + 14;

  return (
    <div className="clip-bar glass" role="toolbar" aria-label="Küpür" style={{ left, top }}>
      <button title="Öne getir" aria-label="Öne getir" onClick={() => clipToFront(id)}>
        <BringFrontIcon />
      </button>
      <button title="Arkaya gönder" aria-label="Arkaya gönder" onClick={() => clipToBack(id)}>
        <SendBackIcon />
      </button>
      <button title="Aynala" aria-label="Aynala" onClick={() => flipClip(id)}>
        <FlipIcon />
      </button>
      <button title="Sil (Delete)" aria-label="Sil" className="danger" onClick={() => deleteClip(id)}>
        <TrashIcon />
      </button>
    </div>
  );
}
