import { describe, expect, it } from 'vitest';
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

function paint(levels: number[][], options = {}) {
  const model = buildTerrainModel(makeTerrain(levels, options));
  const rec = recordingContext();
  paintTerrain(rec.ctx, model, palette, worldBounds(model));
  return { model, ...rec };
}

describe('paintTerrain', () => {
  it('draws a flat grass tile as its top diamond plus the map-edge skirt', () => {
    const { polygons } = paint([[2]]);
    const colours = polygons.map((p) => p.colour);
    expect(colours).toEqual([palette.faces.skirt.lit, palette.faces.skirt.shade, palette.top[2]]);
  });

  it('draws a tile\'s faces before its top, so the top sits over them', () => {
    const { polygons } = paint([[2]]);
    expect(polygons.at(-1)!.colour).toBe(palette.top[2]);
  });

  it('draws a far tile before a near one, so the near one covers it', () => {
    const { polygons } = paint([[1, 3], [3, 1]]);
    const tops = polygons.filter((p) => palette.top.includes(p.colour));
    // Order by x + y then x: (0,0), (1,0), (0,1), (1,1).
    expect(tops.map((p) => p.colour)).toEqual([
      palette.top[1], palette.top[3], palette.top[3], palette.top[1],
    ]);
  });

  it('shades a south face lit and an east face darker, and uses the face\'s material', () => {
    const { polygons } = paint([[4, 3]]); // castle step to the east of (0, 0)
    expect(polygons.map((p) => p.colour)).toContain(palette.faces.castle.shade);
    const south = paint([[4], [3]]).polygons.map((p) => p.colour);
    expect(south).toContain(palette.faces.castle.lit);
  });

  it('draws water with a water colour, not grass', () => {
    const { polygons } = paint([[1, 1]], { water: [[false, true]] });
    const water = polygons.filter((p) => palette.water.includes(p.colour));
    expect(water).toHaveLength(1);
  });

  it('puts the world\'s top-left at (0, 0) of the picture', () => {
    const { polygons, model } = paint([[1, 1], [1, 1]]);
    const bounds = worldBounds(model);
    const xs = polygons.flatMap((p) => p.points.map((pt) => pt.sx));
    const ys = polygons.flatMap((p) => p.points.map((pt) => pt.sy));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(-1e-9);
    expect(Math.max(...xs)).toBeLessThanOrEqual(bounds.width + 1e-9);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(-1e-9);
    expect(Math.max(...ys)).toBeLessThanOrEqual(bounds.height + 1e-9);
  });

  it('draws a shaded cap on a wall and strata lines on a cliff', () => {
    const wall = paint([[2, 1]], { roads: [[true, true]] });
    expect(wall.polygons.some((p) => p.colour === palette.wallCap)).toBe(true);
    const cliff = paint([[4, 0]]);
    expect(cliff.lines.some((l) => l.colour === palette.faces.cliff.line)).toBe(true);
  });

  it('draws adjacent tile ranges identically to one complete pass', () => {
    const model = buildTerrainModel(makeTerrain([[2, 1, 0], [1, 3, 2]]));
    const bounds = worldBounds(model);
    const full = recordingContext();
    const batched = recordingContext();

    paintTerrain(full.ctx, model, palette, bounds);
    for (let start = 0; start < model.order.length; start += 2) {
      paintTerrain(batched.ctx, model, palette, bounds, undefined, undefined, {
        start,
        end: start + 2,
      });
    }

    expect(batched.polygons).toEqual(full.polygons);
    expect(batched.lines).toEqual(full.lines);
  });
});

describe('paintTerrain on the whole town', () => {
  const bounds = worldBounds(townModel);
  const { polygons } = (() => {
    const rec = recordingContext();
    paintTerrain(rec.ctx, townModel, palette, bounds);
    return rec;
  })();

  it('paints one top for every one of the 4,800 tiles', () => {
    const tops = new Set([...palette.top, ...palette.water]);
    // Every tile gets exactly one top polygon; each is a 4-point diamond.
    const diamonds = polygons.filter((p) => tops.has(p.colour) && p.points.length === 4);
    expect(diamonds).toHaveLength(4800);
  });

  it('keeps everything inside the picture bounds', () => {
    for (const p of polygons) {
      for (const pt of p.points) {
        expect(pt.sx).toBeGreaterThanOrEqual(-1e-6);
        expect(pt.sx).toBeLessThanOrEqual(bounds.width + 1e-6);
        expect(pt.sy).toBeGreaterThanOrEqual(-1e-6);
        expect(pt.sy).toBeLessThanOrEqual(bounds.height + 1e-6);
      }
    }
  });

  it('matches the tile diamond exactly for a sample tile', () => {
    const [x, y] = [38, 29];
    const expected = tileCorners(x, y, townModel.surface[y]![x]!).map((p) => ({
      sx: p.sx - bounds.left,
      sy: p.sy - bounds.top,
    }));
    expect(polygons.some((p) => JSON.stringify(p.points) === JSON.stringify(expected))).toBe(true);
  });
});
