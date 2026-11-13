import { useMemo, type CSSProperties } from 'react';
import { STACK_OFFSETS } from '../domain/constants';
import { matches } from '../domain/stats';
import { stacksOf, useBoardStats } from '../hooks/useBoardDerived';
import { selectedId, useAppStore } from '../store/appStore';
import { ClipView } from './ClipView';
import { ItemCard, type CardPlacement } from './ItemCard';
import { RoomFrame } from './RoomFrame';

const EMPTY_STAT = { n: 0, done: 0, sum: 0 };

/** The transformed board layer: rooms, cards and the room being drawn. */
export function World() {
  const board = useAppStore((s) => s.board);
  const view = useAppStore((s) => s.view);
  const filter = useAppStore((s) => s.filter);
  const sel = useAppStore(selectedId);
  const draggingIds = useAppStore((s) => s.draggingIds);
  const dropTarget = useAppStore((s) => s.dropTarget);
  const ghost = useAppStore((s) => s.ghost);
  const animating = useAppStore((s) => s.animating);
  const selectedClip = useAppStore((s) => s.selectedClip);
  const clipDraft = useAppStore((s) => s.clipDraft);
  const clipCursor = useAppStore((s) => s.clipCursor);
  const stats = useBoardStats();

  // Where each card is drawn and whether it matches the filter. A stack matches if any option does.
  const cards = useMemo(() => {
    const sm = stacksOf(board);
    const out = new Map<string, CardPlacement & { match: boolean }>();
    for (const ids of sm.values()) {
      const match = ids.some((i) => matches(board.items[i], filter));
      const front = board.items[ids[0]];
      ids.forEach((i, d) => {
        const off = STACK_OFFSETS[Math.min(d, 2)];
        out.set(i, { left: front.x + off, top: front.y - off, depth: d, stackSize: ids.length, match });
      });
    }
    for (const [id, it] of Object.entries(board.items)) {
      if (!out.has(id))
        out.set(id, { left: it.x, top: it.y, depth: null, stackSize: 0, match: matches(it, filter) });
    }
    return out;
  }, [board, filter]);

  return (
    <div
      className={'world' + (animating ? ' tidy' : '')}
      style={
        {
          transform: `translate(${view.x}px,${view.y}px) scale(${view.k})`,
          '--ik': 1 / view.k,
        } as CSSProperties
      }
    >
      <div>
        {Object.entries(board.groups).map(([id, g]) => (
          <RoomFrame
            key={id}
            id={id}
            group={g}
            stat={stats.rooms.get(id) || EMPTY_STAT}
            selected={sel === id}
          />
        ))}
      </div>
      <div>
        {Object.entries(board.clips)
          .sort((a, b) => a[1].z - b[1].z)
          .map(([id, c]) => (
            <ClipView key={id} id={id} clip={c} selected={selectedClip === id} />
          ))}
      </div>
      <div>
        {Object.entries(board.items).map(([id, it]) => {
          const c = cards.get(id)!;
          return (
            <ItemCard
              key={id}
              id={id}
              item={it}
              left={c.left}
              top={c.top}
              depth={c.depth}
              stackSize={c.stackSize}
              selected={sel === id}
              dragging={!!draggingIds?.has(id)}
              dim={!c.match}
              dropInto={dropTarget === id}
            />
          );
        })}
      </div>
      {clipDraft && clipCursor && (
        <div
          className="clip placing"
          style={{
            left: clipCursor.x - clipDraft.w / 2,
            top: clipCursor.y - clipDraft.h / 2,
            width: clipDraft.w,
            height: clipDraft.h,
          }}
        >
          <img src={clipDraft.img} alt="" draggable={false} />
        </div>
      )}
      {ghost && (
        <div className="ghost" style={{ left: ghost.x, top: ghost.y, width: ghost.w, height: ghost.h }} />
      )}
    </div>
  );
}
