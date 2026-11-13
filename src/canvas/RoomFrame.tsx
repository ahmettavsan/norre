import { memo, type CSSProperties } from 'react';
import { CHIPS } from '../domain/constants';
import { fmt } from '../domain/format';
import type { RoomStat } from '../domain/stats';
import type { Group } from '../domain/types';

interface Props {
  id: string;
  group: Group;
  stat: RoomStat;
  selected: boolean;
}

export const RoomFrame = memo(function RoomFrame({ id, group: g, stat, selected }: Props) {
  const style = {
    left: g.x,
    top: g.y,
    width: g.w,
    height: g.h,
    '--chip': g.color || CHIPS[0],
  } as CSSProperties;

  return (
    <div className={'room' + (selected ? ' selected' : '')} data-id={id} style={style}>
      <div className="room-head">
        <span className="r-name">{g.name || 'İsimsiz oda'}</span>
        <svg className="swoosh" viewBox="0 0 200 14" preserveAspectRatio="none" aria-hidden="true">
          <path d="M2 9 C 40 3, 90 12, 130 6 S 185 4, 198 8" />
        </svg>
      </div>
      <div className="r-meta">
        <span className="r-count">{stat.n ? `${stat.done}/${stat.n} alındı` : 'henüz boş'}</span>
        <span className="r-sum">{stat.sum ? fmt(stat.sum) : ''}</span>
      </div>
      <div className="room-resize" title="Boyutlandır" />
    </div>
  );
});
