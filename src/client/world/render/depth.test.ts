import { describe, expect, it } from 'vitest';
import { backToFront } from './depth';
import { townModel } from '../terrain/town';

const everyTile = townModel.terrain.levels.flatMap((row, y) => row.map((_, x) => ({ x, y })));

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
    const tiles = everyTile;
    expect(backToFront(tiles)).toHaveLength(tiles.length);
    expect(new Set(backToFront(tiles).map((t) => `${t.x},${t.y}`)).size).toBe(tiles.length);
  });

  it('always draws a tile before any tile that is south and/or east of it', () => {
    // "Behind" means smaller-or-equal x and y. A tile that is behind another
    // must be painted first, or it would wrongly cover the nearer one.
    const sorted = backToFront(everyTile);
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

  it('orders all 4,800 tiles of the town, matching the terrain model', () => {
    expect(townModel.order).toHaveLength(4800);
    expect(townModel.order).toEqual(backToFront(everyTile));
  });

  it('never lets a taller, nearer tile be hidden by a farther one (full map)', () => {
    // A tile's drawn shape spans from its top diamond down its two visible faces.
    // If a tile is drawn LATER, it covers the earlier one where they overlap, so
    // it must be the nearer one: larger x + y.
    const position = new Map(townModel.order.map((t, i) => [`${t.x},${t.y}`, i]));
    for (const { x, y } of townModel.order) {
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [2, 0], [0, 2]]) {
        const later = position.get(`${x + dx},${y + dy}`);
        if (later !== undefined) expect(later).toBeGreaterThan(position.get(`${x},${y}`)!);
      }
    }
  });
});
