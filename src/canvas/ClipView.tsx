import { memo } from 'react';
import type { Clip } from '../domain/types';

interface Props {
  id: string;
  clip: Clip;
  selected: boolean;
}

/** A photo cut-out on the board. Selected cut-outs show a rotate handle on top and a resize handle. */
export const ClipView = memo(function ClipView({ id, clip: c, selected }: Props) {
  return (
    <div
      className={'clip' + (selected ? ' selected' : '')}
      data-id={id}
      style={{ left: c.x, top: c.y, width: c.w, height: c.h, transform: `rotate(${c.rot}deg)` }}
    >
      <img src={c.img} alt="" draggable={false} style={c.flip ? { transform: 'scaleX(-1)' } : undefined} />
      {selected && (
        <>
          <div className="clip-rotate" title="Döndür" />
          <div className="clip-resize" title="Boyutlandır" />
        </>
      )}
    </div>
  );
});
