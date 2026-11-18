import { describe, expect, it } from 'vitest';
import type { Terrain } from '../data/types';
import { type Patch } from './patch';
import { pickTile } from './picking';
import { tileCenter } from './projection';

const patch: Patch = { x: 0, y: 0, width: 3, height: 3 };

function flat(level: number): Terrain {
  return {
    width: 3,
    height: 3,
    levels: Array.from({ length: 3 }, () => [level, level, level]),
    water: Array.from({ length: 3 }, () => [false, false, false]),
  };
}

describe('pickTile', () => {
  it('finds a tile from the centre of its top surface', () => {
    const terrain = flat(0);
    for (const [x, y] of [
      [0, 0],
      [2, 1],
      [1, 2],
    ] as const) {
      const { sx, sy } = tileCenter({ x, y }, 0);
      expect(pickTile(terrain, patch, sx, sy)).toMatchObject({ x, y, level: 0 });
    }
  });

  it('returns nothing for a point outside the patch', () => {
    expect(pickTile(flat(0), patch, 5000, 5000)).toBeNull();
  });

  it('reports water tiles', () => {
    const terrain = flat(1);
    (terrain.water as boolean[][])[1]![1] = true;
    const { sx, sy } = tileCenter({ x: 1, y: 1 }, 1);
    expect(pickTile(terrain, patch, sx, sy)).toMatchObject({ x: 1, y: 1, water: true });
  });

  it('picks the nearer, higher tile when it hides a tile behind it', () => {
    // Tile (1, 1) is 3 levels up, so its top is lifted 30 px. A point at the
    // middle of that raised top must return (1, 1).
    const terrain = flat(0);
    (terrain.levels as number[][])[1]![1] = 3;
    const { sx, sy } = tileCenter({ x: 1, y: 1 }, 3);
    expect(pickTile(terrain, patch, sx, sy)).toMatchObject({ x: 1, y: 1, level: 3 });
  });

  it('does not report the raised tile at the spot where its flat ground would have been', () => {
    const terrain = flat(0);
    (terrain.levels as number[][])[1]![1] = 3;
    // The raised top sits 30 px higher on screen than level 0 would, so the
    // old ground position is empty air: the tile is not found there.
    const { sx, sy } = tileCenter({ x: 1, y: 1 }, 0);
    expect(pickTile(terrain, patch, sx, sy)).toBeNull();
  });
});
