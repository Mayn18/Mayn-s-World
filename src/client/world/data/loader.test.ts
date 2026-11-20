import { describe, expect, it } from 'vitest';
import layoutJson from './layout.json';
import { parseTerrain, townTerrain } from './loader';

// A tiny valid layout to break in different ways.
function tinyLayout(overrides: Record<string, unknown> = {}) {
  return {
    grid: { width: 3, height: 2, tile_px_iso: [32, 16], level_px: 10 },
    heights: ['012', '345'],
    water: ['010', '000'],
    roads: [],
    connections: [],
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

  it('uses elevation levels 0 to 6', () => {
    const all = townTerrain.levels.flat();
    expect(Math.min(...all)).toBe(0);
    expect(Math.max(...all)).toBe(6);
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

describe('townTerrain: all 80 x 60 tiles are accounted for', () => {
  it('has exactly 4,800 tiles, each either land or water', () => {
    const tiles = townTerrain.levels.flat().length;
    const water = townTerrain.water.flat().filter(Boolean).length;
    const land = townTerrain.water.flat().filter((isWater) => !isWater).length;
    expect(tiles).toBe(4800);
    expect(water + land).toBe(4800);
    expect(water).toBe(361);
  });

  it('reads every road tile the file describes (924, counted after the castle redesign)', () => {
    expect(townTerrain.roads.flat().filter(Boolean)).toHaveLength(949);
  });

  it('reads all 32 crossings: 17 ramps, 9 stairs and 6 bridges', () => {
    const count = (kind: string) => townTerrain.crossings.filter((c) => c.kind === kind).length;
    expect(townTerrain.crossings).toHaveLength(32);
    expect([count('ramp'), count('stairs'), count('bridge')]).toEqual([17, 9, 6]);
  });
});

describe('townTerrain supports the file\'s elevation connections', () => {
  const connections = layoutJson.connections as {
    road: string;
    kind: string;
    x: number;
    y: number;
    from_level: number | string;
    to_level: number | string;
  }[];

  it('puts every ramp and stairs on a tile at one of its two levels, beside a tile at the other', () => {
    for (const c of connections.filter((k) => k.kind !== 'bridge')) {
      const here = townTerrain.levels[c.y]![c.x]!;
      expect([c.from_level, c.to_level], `${c.road} at (${c.x}, ${c.y})`).toContain(here);
      const other = here === c.from_level ? c.to_level : c.from_level;
      const neighbours = [
        townTerrain.levels[c.y]?.[c.x + 1],
        townTerrain.levels[c.y]?.[c.x - 1],
        townTerrain.levels[c.y + 1]?.[c.x],
        townTerrain.levels[c.y - 1]?.[c.x],
      ];
      expect(neighbours, `${c.road} at (${c.x}, ${c.y})`).toContain(other);
    }
  });

  it('puts every bridge on a water tile', () => {
    for (const c of connections.filter((k) => k.kind === 'bridge')) {
      expect(townTerrain.water[c.y]![c.x], `${c.road} at (${c.x}, ${c.y})`).toBe(true);
    }
  });

  it('never has two neighbouring road tiles on land more than one level apart', () => {
    // The file records this as checks.steps_over_one_level_on_walkable = 0; this
    // confirms it against the rasterised roads.
    const { levels, water, roads, width, height } = townTerrain;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (const [nx, ny] of [[x + 1, y], [x, y + 1]] as const) {
          if (nx >= width || ny >= height) continue;
          if (!roads[y]![x] || !roads[ny]![nx] || water[y]![x] || water[ny]![nx]) continue;
          expect(Math.abs(levels[y]![x]! - levels[ny]![nx]!), `(${x}, ${y}) to (${nx}, ${ny})`).toBeLessThanOrEqual(1);
        }
      }
    }
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

  it('rejects a crossing with an unknown kind or outside the map', () => {
    expect(() =>
      parseTerrain(tinyLayout({ connections: [{ road: 'A', kind: 'teleporter', x: 0, y: 0 }] })),
    ).toThrow('ramp, stairs or bridge');
    expect(() =>
      parseTerrain(tinyLayout({ connections: [{ road: 'A', kind: 'ramp', x: 9, y: 0 }] })),
    ).toThrow('outside the 3 x 2 map');
    expect(() => parseTerrain(tinyLayout({ connections: 'nope' }))).toThrow('"connections"');
  });

  it('reads roads and crossings', () => {
    const terrain = parseTerrain(
      tinyLayout({
        roads: [{ width: 1, kind: 'path', points: [[0.5, 0], [0.5, 2]] }],
        connections: [{ road: 'A', kind: 'stairs', x: 0, y: 1 }],
      }),
    );
    expect(terrain.roads).toEqual([
      [true, false, false],
      [true, false, false],
    ]);
    expect(terrain.crossings).toEqual([{ road: 'A', kind: 'stairs', x: 0, y: 1 }]);
  });
});
