import { describe, expect, it } from 'vitest';
import { backToFront } from './depth';
import { TERRAIN_PATCH, tilesInPatch } from './patch';

describe('backToFront', () => {
  it('draws the tile with the smallest x + y first and the largest last', () => {
    const sorted = backToFront([
      { x: 5, y: 5 },
      { x: 0, y: 0 },
      { x: 2, y: 1 },
    ]);
    expect(sorted).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 1 },
      { x: 5, y: 5 },
    ]);
  });

  it('breaks ties on the same diagonal by x, so the order is repeatable', () => {
    const sorted = backToFront([
      { x: 3, y: 0 },
      { x: 0, y: 3 },
      { x: 1, y: 2 },
    ]);
    expect(sorted.map((t) => t.x)).toEqual([0, 1, 3]);
  });

  it('does not change the array it is given', () => {
    const input = [
      { x: 2, y: 2 },
      { x: 0, y: 0 },
    ];
    backToFront(input);
    expect(input).toEqual([
      { x: 2, y: 2 },
      { x: 0, y: 0 },
    ]);
  });

  it('keeps every tile exactly once', () => {
    const tiles = tilesInPatch(TERRAIN_PATCH);
    expect(backToFront(tiles)).toHaveLength(tiles.length);
    expect(new Set(backToFront(tiles).map((t) => `${t.x},${t.y}`)).size).toBe(tiles.length);
  });

  it('always draws a tile before any tile that is south and/or east of it', () => {
    // "Behind" means smaller-or-equal x and y. A tile that is behind another
    // must be painted first, or it would wrongly cover the nearer one.
    const sorted = backToFront(tilesInPatch(TERRAIN_PATCH));
    const position = new Map(sorted.map((t, i) => [`${t.x},${t.y}`, i]));
    for (const a of sorted) {
      for (const b of [
        { x: a.x + 1, y: a.y },
        { x: a.x, y: a.y + 1 },
        { x: a.x + 1, y: a.y + 1 },
      ]) {
        const later = position.get(`${b.x},${b.y}`);
        if (later !== undefined) {
          expect(later).toBeGreaterThan(position.get(`${a.x},${a.y}`)!);
        }
      }
    }
  });
});
