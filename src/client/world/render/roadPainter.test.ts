import { describe, expect, it } from 'vitest';
import type { Crossing, RoadKind, RoadTile } from '../data/types';
import { buildRoadLayer, groundKind } from '../roads/roadLayer';
import { townRoadLayer } from '../roads/town';
import { makeTerrain } from '../terrain/fixtures';
import { buildTerrainModel } from '../terrain/model';
import { townModel } from '../terrain/town';
import { defaultTheme } from '../themes';
import { worldBounds } from './bounds';
import { tileCorners } from './projection';
import { recordingContext } from './recordingContext';
import { paintTerrain } from './terrainPainter';
import { terrainPalette } from './terrainPalette';

const palette = terrainPalette(defaultTheme);
const roads = palette.roads;

const tile = (kind: RoadKind, axis: 'x' | 'y' = 'x'): RoadTile => ({ kind, axis, name: 'test' });

interface Setup {
  water?: boolean[][];
  roadTiles?: (RoadTile | null)[][];
  crossings?: Crossing[];
}

// Paints a small hand-made map with its road layer.
function paint(levels: number[][], options: Setup = {}) {
  const model = buildTerrainModel(makeTerrain(levels, options));
  const bounds = worldBounds(model);
  const rec = recordingContext();
  paintTerrain(rec.ctx, model, palette, bounds, buildRoadLayer(model));
  return { model, bounds, ...rec };
}

// A tile's top diamond as it appears in the picture (the painter shifts by bounds).
function diamond(bounds: { left: number; top: number }, x: number, y: number, level: number) {
  return tileCorners(x, y, level).map((p) => ({ sx: p.sx - bounds.left, sy: p.sy - bounds.top }));
}

const withColour = <T extends { colour: string }>(items: T[], colour: string): T[] =>
  items.filter((item) => item.colour === colour);

describe('streets, lanes and tracks', () => {
  it('lays a street over the tile in the street colour, with no grass underneath', () => {
    const { polygons, bounds } = paint([[2]], { roadTiles: [[tile('main')]] });
    const street = withColour(polygons, roads.surface.main);
    expect(street).toHaveLength(1);
    expect(street[0]!.points).toEqual(diamond(bounds, 0, 0, 2));
    expect(withColour(polygons, palette.top[2]!)).toHaveLength(0);
  });

  it('still draws grass on the tiles beside a road', () => {
    const { polygons } = paint([[2, 2]], { roadTiles: [[tile('main'), null]] });
    expect(withColour(polygons, palette.top[2]!)).toHaveLength(1);
    expect(withColour(polygons, roads.surface.main)).toHaveLength(1);
  });

  it('gives each kind of road its own colour', () => {
    const kinds = ['main', 'lane', 'path'] as const;
    const { polygons } = paint([[2, 2, 2]], { roadTiles: [kinds.map((k) => tile(k))] });
    for (const kind of kinds) {
      expect(withColour(polygons, roads.surface[kind]), kind).toHaveLength(1);
    }
    expect(new Set(kinds.map((k) => roads.surface[k])).size).toBe(3);
  });

  it('puts a kerb on every open side of a street and none between neighbouring street tiles', () => {
    const one = paint([[2]], { roadTiles: [[tile('main')]] });
    expect(withColour(one.lines, roads.kerb)).toHaveLength(4);
    const two = paint([[2, 2]], { roadTiles: [[tile('main'), tile('main')]] });
    expect(withColour(two.lines, roads.kerb)).toHaveLength(6); // 3 + 3, the shared side has none
  });

  it('keeps the kerb inside the tile it borders', () => {
    const { lines, bounds } = paint([[2]], { roadTiles: [[tile('main')]] });
    const corners = diamond(bounds, 0, 0, 2);
    const xs = corners.map((c) => c.sx);
    const ys = corners.map((c) => c.sy);
    for (const line of withColour(lines, roads.kerb)) {
      for (const p of [line.from, line.to]) {
        expect(p.sx).toBeGreaterThanOrEqual(Math.min(...xs) - 1e-9);
        expect(p.sx).toBeLessThanOrEqual(Math.max(...xs) + 1e-9);
        expect(p.sy).toBeGreaterThanOrEqual(Math.min(...ys) - 1e-9);
        expect(p.sy).toBeLessThanOrEqual(Math.max(...ys) + 1e-9);
      }
    }
  });

  it('gives lanes and tracks no kerb: they fade straight into the grass', () => {
    for (const kind of ['lane', 'path'] as const) {
      const { lines } = paint([[2]], { roadTiles: [[tile(kind)]] });
      expect(withColour(lines, roads.kerb), kind).toHaveLength(0);
    }
  });

  it('draws a road at the height of the ground it lies on', () => {
    const { polygons, bounds } = paint([[1, 3]], { roadTiles: [[null, tile('lane')]] });
    expect(withColour(polygons, roads.surface.lane)[0]!.points).toEqual(diamond(bounds, 1, 0, 3));
  });
});

describe('the Market Square', () => {
  it('is paved with its own colour, over the fountain tile', () => {
    const { polygons } = (() => {
      const rec = recordingContext();
      paintTerrain(rec.ctx, townModel, palette, worldBounds(townModel), townRoadLayer);
      return rec;
    })();
    const bounds = worldBounds(townModel);
    const [x, y] = [38, 30];
    expect(groundKind(townModel, townRoadLayer, x, y)).toBe('plaza');
    const expected = JSON.stringify(diamond(bounds, x, y, townModel.surface[y]![x]!));
    const match = polygons.find((p) => JSON.stringify(p.points) === expected);
    expect(match?.colour).toBe(roads.surface.plaza);
  });
});

describe('ramps and stairs', () => {
  // A road running north-south that steps down one level from (0, 0) to (0, 1).
  const down = {
    roadTiles: [[tile('main', 'y')], [tile('main', 'y')]],
    crossings: [{ x: 0, y: 0, road: 'test', kind: 'stairs' as const }],
  };

  it('draws stairs over the south face where a road steps down, lit', () => {
    const { polygons } = paint([[1], [0]], down);
    expect(withColour(polygons, roads.stairs.lit)).toHaveLength(1);
  });

  it('puts a lit edge on every tread but the first, and none for a ramp', () => {
    const stairs = paint([[1], [0]], down);
    // One level is 10 px; a tread every 3.5 px is 3 treads, so 2 edges between them.
    expect(withColour(stairs.lines, roads.stairs.line)).toHaveLength(2);
    const ramp = paint([[1], [0]], { ...down, crossings: [{ x: 0, y: 0, road: 'test', kind: 'ramp' }] });
    expect(withColour(ramp.lines, roads.stairs.line)).toHaveLength(0);
    expect(withColour(ramp.polygons, roads.rampPaved.lit)).toHaveLength(1);
  });

  it('shades an east-facing flight darker than a south-facing one', () => {
    const { polygons } = paint([[1, 0]], {
      roadTiles: [[tile('main'), tile('main')]],
      crossings: [{ x: 0, y: 0, road: 'test', kind: 'stairs' }],
    });
    expect(withColour(polygons, roads.stairs.shade)).toHaveLength(1);
    expect(withColour(polygons, roads.stairs.lit)).toHaveLength(0);
  });

  it('uses earth colours for a ramp on a track and stone colours on a street', () => {
    const track = paint([[1], [0]], {
      roadTiles: [[tile('path', 'y')], [tile('path', 'y')]],
      crossings: [{ x: 0, y: 0, road: 'test', kind: 'ramp' }],
    });
    expect(withColour(track.polygons, roads.rampEarth.lit)).toHaveLength(1);
    expect(withColour(track.polygons, roads.rampPaved.lit)).toHaveLength(0);
  });

  it('edges a ramp on both sides, but not between the tiles of one wide ramp', () => {
    const wide = paint([[1, 1], [0, 0]], {
      roadTiles: [
        [tile('path', 'y'), tile('path', 'y')],
        [tile('path', 'y'), tile('path', 'y')],
      ],
      crossings: [{ x: 0, y: 0, road: 'test', kind: 'ramp' }],
    });
    expect(withColour(wide.polygons, roads.rampEarth.lit)).toHaveLength(2);
    // Two tiles, so 4 sides, minus the 2 that touch: 2 edge lines.
    expect(withColour(wide.lines, roads.kerb)).toHaveLength(2);
  });

  it('covers a tile\'s face exactly: same four corners as the wall or bank it replaces', () => {
    const { polygons } = paint([[1], [0]], down);
    const stairs = withColour(polygons, roads.stairs.lit)[0]!;
    const face = polygons.find((p) => p.colour !== roads.stairs.lit && p.points.length === 4 && JSON.stringify(p.points) === JSON.stringify(stairs.points));
    expect(face !== undefined).toBe(true);
  });
});

describe('bridges and piers', () => {
  // A 3 x 3 pond with a single deck tile in the middle.
  const pond = (kind: RoadKind) => ({
    water: [
      [true, true, true],
      [true, true, true],
      [true, true, true],
    ],
    roadTiles: [
      [null, null, null],
      [null, tile(kind), null],
      [null, null, null],
    ],
  });
  const levels = [
    [1, 1, 1],
    [1, 1, 1],
    [1, 1, 1],
  ];

  it('draws the deck at the level of the land, over water that is lower', () => {
    const { polygons, bounds } = paint(levels, pond('pier'));
    const deck = withColour(polygons, roads.timber.deck);
    expect(deck).toHaveLength(1);
    expect(deck[0]!.points).toEqual(diamond(bounds, 1, 1, 1));
  });

  it('does not draw water under the deck, only around it', () => {
    const { polygons } = paint(levels, pond('pier'));
    const water = polygons.filter((p) => palette.water.includes(p.colour) && p.points.length === 4);
    expect(water).toHaveLength(8);
  });

  it('hangs a side down to the water on the two sides a viewer can see', () => {
    const { polygons } = paint(levels, pond('pier'));
    expect(withColour(polygons, roads.timber.face.lit)).toHaveLength(1);
    expect(withColour(polygons, roads.timber.face.shade)).toHaveLength(1);
  });

  it('puts a rail on every side that is open water', () => {
    const { lines } = paint(levels, pond('pier'));
    expect(withColour(lines, roads.timber.rail)).toHaveLength(4);
  });

  it('shows no side and no rail where the deck meets land', () => {
    const { polygons, lines } = paint([[1, 1, 1]], {
      water: [[false, true, false]],
      roadTiles: [[tile('main'), tile('main'), tile('main')]],
    });
    expect(withColour(polygons, roads.stone.face.lit)).toHaveLength(0);
    expect(withColour(polygons, roads.stone.face.shade)).toHaveLength(0);
    expect(withColour(lines, roads.stone.rail)).toHaveLength(0);
  });

  it('builds a main street\'s bridge in stone and a path or pier in timber', () => {
    const stone = paint(levels, pond('main'));
    expect(withColour(stone.polygons, roads.stone.face.lit)).toHaveLength(1);
    expect(withColour(stone.polygons, roads.timber.face.lit)).toHaveLength(0);
    const timber = paint(levels, pond('path'));
    expect(withColour(timber.polygons, roads.timber.face.lit)).toHaveLength(1);
  });
});

describe('the whole town with roads', () => {
  const bounds = worldBounds(townModel);
  const rec = recordingContext();
  paintTerrain(rec.ctx, townModel, palette, bounds, townRoadLayer);
  const { polygons, lines } = rec;

  it('still paints exactly one top for each of the 4,800 tiles', () => {
    const tops = new Set([
      ...palette.top,
      ...palette.water,
      ...Object.values(roads.surface),
      roads.timber.deck,
      roads.stone.deck,
    ]);
    expect(polygons.filter((p) => tops.has(p.colour) && p.points.length === 4)).toHaveLength(4800);
  });

  it('paints one deck for every tile where a road crosses water', () => {
    let decks = 0;
    for (const row of townRoadLayer.decks) for (const on of row) if (on) decks++;
    expect(decks).toBeGreaterThan(0);
    const deckColours = new Set([roads.timber.deck, roads.stone.deck]);
    const painted = polygons.filter((p) => deckColours.has(p.colour) && p.points.length === 4);
    // The stone deck shares the street colour, so count the street tiles that are not decks.
    let streets = 0;
    for (let y = 0; y < townModel.terrain.height; y++) {
      for (let x = 0; x < townModel.terrain.width; x++) {
        if (groundKind(townModel, townRoadLayer, x, y) === 'main') streets++;
      }
    }
    const timber = painted.filter((p) => p.colour === roads.timber.deck).length;
    const mainColoured = painted.filter((p) => p.colour === roads.stone.deck).length;
    expect(timber + (mainColoured - streets)).toBe(decks);
  });

  it('paints a ramp or flight of stairs for every climb', () => {
    const climbColours = new Set([
      roads.stairs.lit, roads.stairs.shade, roads.rampPaved.lit, roads.rampPaved.shade,
      roads.rampEarth.lit, roads.rampEarth.shade,
    ]);
    const painted = polygons.filter((p) => climbColours.has(p.colour) && p.points.length === 4);
    expect(painted).toHaveLength(townRoadLayer.climbs.size);
  });

  it('keeps every polygon and line inside the picture', () => {
    const inside = (p: { sx: number; sy: number }) =>
      p.sx >= -1e-6 && p.sx <= bounds.width + 1e-6 && p.sy >= -1e-6 && p.sy <= bounds.height + 1e-6;
    for (const polygon of polygons) for (const point of polygon.points) expect(inside(point)).toBe(true);
    for (const line of lines) {
      expect(inside(line.from)).toBe(true);
      expect(inside(line.to)).toBe(true);
    }
  });

  it('is the same terrain as before underneath: no road layer, same grass and water tiles', () => {
    const bare = recordingContext();
    paintTerrain(bare.ctx, townModel, palette, bounds);
    const tops = new Set([...palette.top, ...palette.water]);
    const bareTops = bare.polygons.filter((p) => tops.has(p.colour) && p.points.length === 4);
    const withRoadTops = polygons.filter((p) => tops.has(p.colour) && p.points.length === 4);
    expect(bareTops).toHaveLength(4800);
    // Every tile that is not covered by a road, the square or a deck keeps its top.
    const covered = bareTops.length - withRoadTops.length;
    let expectedCovered = 0;
    for (let y = 0; y < townModel.terrain.height; y++) {
      for (let x = 0; x < townModel.terrain.width; x++) {
        if (townRoadLayer.decks[y]![x]! || groundKind(townModel, townRoadLayer, x, y) !== null) expectedCovered++;
      }
    }
    expect(covered).toBe(expectedCovered);
  });
});
