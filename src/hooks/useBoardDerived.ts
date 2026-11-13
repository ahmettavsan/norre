import { boardStats, type BoardStats } from '../domain/stats';
import { stackMap } from '../domain/stacks';
import type { Board } from '../domain/types';
import { useAppStore } from '../store/appStore';

/** Caches a derivation per board snapshot so every component reading it shares one computation. */
function perBoard<T>(fn: (b: Board) => T): (b: Board) => T {
  const cache = new WeakMap<Board, T>();
  return (b) => {
    let v = cache.get(b);
    if (v === undefined) {
      v = fn(b);
      cache.set(b, v);
    }
    return v;
  };
}

export const statsOf = perBoard(boardStats);
export const stacksOf = perBoard(stackMap);

export const useBoardStats = (): BoardStats => statsOf(useAppStore((s) => s.board));
