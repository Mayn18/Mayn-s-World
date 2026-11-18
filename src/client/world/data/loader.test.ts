import { describe, expect, it } from 'vitest';
import layoutJson from './layout.json';
import { parseTerrain, townTerrain } from './loader';

// A tiny valid layout to break in different ways.
function tinyLayout(overrides: Record<string, unknown> = {}) {
  return {
    grid: { width: 3, height: 2, tile_px_iso: [32, 16], level_px: 10 },
    heights: ['012', '345'],
    water: ['010', '000'],
    ...overrides,
  };
}

describe('townTerrain (the real layout.json)', () => {
  it('is 80 x 60 tiles', () => {
    expect(townTerrain.width).toBe(80);
    expect(townTerrain.height).toBe(60);
    expect(townTerrain.levels).toHaveLength(60);
    expect(townTerrain.levels.every((row) => row.length === 80)).toBe(true);
    expect(townTerrain.water.every((row) => row.length === 80)).toBe(true);
  });

  it('uses elevation levels 0 to 5', () => {
    const all = townTerrain.levels.flat();
    expect(Math.min(...all)).toBe(0);
    expect(Math.max(...all)).toBe(5);
  });

  it('matches known tiles in the file (x, y)', () => {
    expect(townTerrain.levels[0]![0]).toBe(3); // north-west corner, high ground
    expect(townTerrain.levels[29]![38]).toBe(1); // the plaza
    expect(townTerrain.water[15]![64]).toBe(true); // where the north-east stream starts
    expect(townTerrain.water[0]![0]).toBe(false);
  });

  it('has the same number of water tiles as the file', () => {
    const inFile = layoutJson.water.join('').split('1').length - 1;
    expect(inFile).toBe(361);
    expect(townTerrain.water.flat().filter(Boolean)).toHaveLength(361);
  });
});

describe('parseTerrain', () => {
  it('reads levels and water as numbers and booleans, indexed [y][x]', () => {
    const terrain = parseTerrain(tinyLayout());
    expect(terrain.width).toBe(3);
    expect(terrain.height).toBe(2);
    expect(terrain.levels).toEqual([
      [0, 1, 2],
      [3, 4, 5],
    ]);
    expect(terrain.water).toEqual([
      [false, true, false],
      [false, false, false],
    ]);
  });

  it('rejects data that is not an object with a grid', () => {
    expect(() => parseTerrain(null)).toThrow('missing "grid"');
    expect(() => parseTerrain({})).toThrow('missing "grid"');
    expect(() => parseTerrain([])).toThrow('missing "grid"');
  });

  it('rejects a grid size that is not a positive whole number', () => {
    const layout = tinyLayout({ grid: { width: 0, height: 2, tile_px_iso: [32, 16], level_px: 10 } });
    expect(() => parseTerrain(layout)).toThrow('grid.width');
  });

  it('rejects tile proportions the projection does not use', () => {
    const layout = tinyLayout({ grid: { width: 3, height: 2, tile_px_iso: [64, 32], level_px: 10 } });
    expect(() => parseTerrain(layout)).toThrow('tile_px_iso');
  });

  it('rejects a different level height', () => {
    const layout = tinyLayout({ grid: { width: 3, height: 2, tile_px_iso: [32, 16], level_px: 8 } });
    expect(() => parseTerrain(layout)).toThrow('level_px');
  });

  it('rejects the wrong number of rows and says which grid', () => {
    expect(() => parseTerrain(tinyLayout({ heights: ['012'] }))).toThrow('"heights" has 1 rows');
  });

  it('rejects a row of the wrong width and says which row', () => {
    expect(() => parseTerrain(tinyLayout({ water: ['010', '00'] }))).toThrow(
      '"water" row 1 is 2 wide, expected 3',
    );
  });

  it('rejects a height that is not a digit and says where', () => {
    expect(() => parseTerrain(tinyLayout({ heights: ['012', '3x5'] }))).toThrow(
      'heights (1, 1) is "x"',
    );
  });

  it('rejects a water value other than 0 or 1 and says where', () => {
    expect(() => parseTerrain(tinyLayout({ water: ['010', '002'] }))).toThrow(
      'water (2, 1) is "2"',
    );
  });

  it('rejects a grid that is not a list of strings', () => {
    expect(() => parseTerrain(tinyLayout({ heights: 'nope' }))).toThrow('list of row strings');
    expect(() => parseTerrain(tinyLayout({ heights: ['012', 345] }))).toThrow('row 1 is not a string');
  });
});
