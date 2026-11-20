import { describe, expect, it } from 'vitest';
import { townTerrain } from '../data/loader';
import layoutJson from '../data/layout.json';
import { makeTerrain } from './fixtures';
import { buildTerrainModel } from './model';
import { townModel } from './town';

function kinds(levels: number[][], options = {}) {
  return buildTerrainModel(makeTerrain(levels, options)).edges.map((e) => e.kind);
}

describe('terrain boundaries: classification rules', () => {
  it('records no edge between tiles of equal height', () => {
    expect(kinds([[2, 2], [2, 2]])).toEqual([]);
  });

  it('records each step once, from its higher tile', () => {
    const { edges } = buildTerrainModel(makeTerrain([[1, 0]]));
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ high: { x: 0, y: 0 }, low: { x: 1, y: 0 }, direction: 'E' });
  });

  it('makes a drop of 2 or more a cliff', () => {
    expect(kinds([[3, 1]])).toEqual(['cliff']);
  });

  it('makes a one-level step on open ground a slope', () => {
    expect(kinds([[2, 1]])).toEqual(['slope']);
  });

  it('makes a one-level step touching level 4 or higher a castle base', () => {
    expect(kinds([[4, 3]])).toEqual(['castle']);
    expect(kinds([[5, 4]])).toEqual(['castle']);
  });

  it('makes land above water a bank and water above lower ground a cascade', () => {
    expect(kinds([[1, 1]], { water: [[false, true]] })).toEqual(['bank']);
    expect(kinds([[1, 0]], { water: [[true, false]] })).toEqual(['cascade']);
  });

  it('draws water below its own level, so even a level-flat shore has a bank step', () => {
    const model = buildTerrainModel(makeTerrain([[1, 1]], { water: [[false, true]] }));
    expect(model.edges[0]).toMatchObject({ top: 1, bottom: 0.6 });
  });

  it('turns a mostly-developed run of one-level steps into a retaining wall', () => {
    // A terrace edge of 4 tiles (columns 0|1), with a road beside it.
    const levels = [[2, 1], [2, 1], [2, 1], [2, 1]];
    const roads = levels.map((row) => row.map(() => true));
    expect(kinds(levels, { roads })).toEqual(['wall', 'wall', 'wall', 'wall']);
    expect(kinds(levels)).toEqual(['slope', 'slope', 'slope', 'slope']);
  });

  it('keeps one run one material (no dashes of wall and grass)', () => {
    const levels = [[2, 1], [2, 1], [2, 1], [2, 1]];
    const roads = levels.map((row, y) => row.map(() => y < 3)); // 3 of 4 developed
    expect(new Set(kinds(levels, { roads })).size).toBe(1);
  });

  it('breaks a wall across the whole width of a road that climbs by ramp or stairs', () => {
    // The road is 2 tiles wide (rows 0 and 1); row 2 is beside it, not on it.
    const levels = [[2, 1], [2, 1], [2, 1]];
    const roads = [[true, true], [true, true], [false, false]];
    const result = kinds(levels, {
      roads,
      crossings: [{ road: 'test', kind: 'stairs', x: 0, y: 1 }],
    });
    expect(result).toEqual(['slope', 'slope', 'wall']);
  });
});

describe('terrain boundaries: the real town against the file\'s level_edges', () => {
  const count = (kind: string) => townModel.edges.filter((e) => e.kind === kind).length;
  const inFile = layoutJson.level_edges as Record<string, number>;

  it('finds the file\'s castle total exactly', () => {
    expect(count('castle')).toBe(78);
    expect(inFile.castle).toBe(78);
  });

  it('finds the file\'s slope + wall total exactly', () => {
    expect(count('slope') + count('wall')).toBe(285);
    expect(inFile.slope + inFile.wall).toBe(285);
  });

  it('pins the derived wall / slope split (119 / 166; the file says 133 / 152)', () => {
    expect(count('wall')).toBe(119);
    expect(count('slope')).toBe(166);
  });

  it('finds the file\'s 4 riverbanks, counting land-to-water steps of different height', () => {
    // Banks also appear wherever land meets water at equal level (the 0.4 drop), so
    // compare only those whose levels really differ.
    const real = townModel.edges.filter(
      (e) =>
        e.kind === 'bank' &&
        townTerrain.levels[e.high.y]![e.high.x]! !== townTerrain.levels[e.low.y]![e.low.x]!,
    );
    expect(real).toHaveLength(4);
    expect(inFile.bank).toBe(4);
  });

  it('finds the file\'s cliff total exactly', () => {
    expect(count('cliff')).toBe(110);
    expect(inFile.cliff).toBe(110);
  });

  it('gives every step a positive height', () => {
    for (const e of townModel.edges) expect(e.top).toBeGreaterThan(e.bottom);
  });
});

describe('water and land classification', () => {
  it('has a cascade only where water sits above lower ground', () => {
    for (const e of townModel.edges.filter((k) => k.kind === 'cascade')) {
      expect(townTerrain.water[e.high.y]![e.high.x]).toBe(true);
    }
  });

  it('has a bank only where land meets water', () => {
    for (const e of townModel.edges.filter((k) => k.kind === 'bank')) {
      expect(townTerrain.water[e.high.y]![e.high.x]).toBe(false);
      expect(townTerrain.water[e.low.y]![e.low.x]).toBe(true);
    }
  });

  it('never makes a rock, wall, slope or castle face out of a water edge', () => {
    for (const e of townModel.edges) {
      const water = townTerrain.water[e.high.y]![e.high.x]! || townTerrain.water[e.low.y]![e.low.x]!;
      if (water) expect(['bank', 'cascade']).toContain(e.kind);
    }
  });
});
