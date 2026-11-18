import { describe, expect, it } from 'vitest';
import { LEVEL_PX, mapToScreen, screenToMap, tileCenter, tileCorners } from './projection';

describe('mapToScreen', () => {
  it('puts the map origin at the screen origin', () => {
    expect(mapToScreen(0, 0)).toEqual({ sx: 0, sy: 0 });
  });

  it('moves 16 px right and 8 px down for one tile east', () => {
    expect(mapToScreen(1, 0)).toEqual({ sx: 16, sy: 8 });
  });

  it('moves 16 px left and 8 px down for one tile south', () => {
    expect(mapToScreen(0, 1)).toEqual({ sx: -16, sy: 8 });
  });

  it('puts the far corner of a tile one full tile height below the near one', () => {
    // East then south = straight down 16 px, which is the tile height.
    expect(mapToScreen(1, 1)).toEqual({ sx: 0, sy: 16 });
  });

  it('lifts the picture straight up by 10 px per level', () => {
    expect(mapToScreen(3, 2, 0).sx).toBe(mapToScreen(3, 2, 2).sx);
    expect(mapToScreen(3, 2, 2).sy).toBe(mapToScreen(3, 2, 0).sy - 2 * LEVEL_PX);
  });
});

describe('screenToMap', () => {
  it('inverts mapToScreen at every level, including fractions', () => {
    for (const level of [0, 1, 3, 5]) {
      for (const [x, y] of [
        [0, 0],
        [12, 7],
        [79.5, 59.25],
        [3.5, 40],
      ] as const) {
        const { sx, sy } = mapToScreen(x, y, level);
        const back = screenToMap(sx, sy, level);
        expect(back.x).toBeCloseTo(x, 9);
        expect(back.y).toBeCloseTo(y, 9);
      }
    }
  });

  it('depends on the level: one screen point is a different map point at another level', () => {
    const level0 = screenToMap(0, 40, 0);
    const level2 = screenToMap(0, 40, 2);
    expect(level2.x).not.toBeCloseTo(level0.x);
  });
});

describe('tileCorners', () => {
  it('returns the N, E, S, W corners of a diamond 32 wide and 16 tall', () => {
    const [n, e, s, w] = tileCorners(4, 4, 0);
    expect(e!.sx - w!.sx).toBe(32);
    expect(s!.sy - n!.sy).toBe(16);
    // N is the top corner, S the bottom, and they share an x position.
    expect(n!.sx).toBe(s!.sx);
    expect(e!.sy).toBe(w!.sy);
  });

  it('puts the centre halfway between opposite corners', () => {
    const [n, , s] = tileCorners(6, 2, 1);
    const centre = tileCenter({ x: 6, y: 2 }, 1);
    expect(centre.sx).toBe((n!.sx + s!.sx) / 2);
    expect(centre.sy).toBe((n!.sy + s!.sy) / 2);
  });
});
