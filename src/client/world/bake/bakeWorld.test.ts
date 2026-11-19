import { beforeAll, describe, expect, it } from 'vitest';
import { hex } from '../pixel/buffer';
import { mapToScreen, tileCenter } from '../render/projection';
import { townModel } from '../terrain/town';
import { defaultTheme } from '../themes';
import { type BakedWorld, bakeWorld } from './bakeWorld';
import { buildMaterials } from './materials';
import { ART, toArt } from './space';
import { isPlaza } from './zones';

let world: BakedWorld;
let elapsed = 0;
beforeAll(() => {
  const start = performance.now();
  world = bakeWorld(townModel, defaultTheme);
  elapsed = performance.now() - start;
}, 60000);

function pixelAtTile(x: number, y: number, du = 0, dv = 0) {
  const c = tileCenter({ x, y }, townModel.surface[y]![x]!);
  // offset in map units, converted to screen: u moves right-down, v moves left-down
  const sx = c.sx + (du - dv) * 16;
  const sy = c.sy + (du + dv) * 8;
  const a = toArt(world.space, { sx, sy });
  return world.buffer.get(Math.floor(a.x), Math.floor(a.y));
}

describe('bakeWorld', () => {
  it('makes a bitmap the size of the world at ART pixels per screen pixel', () => {
    expect(world.space.width).toBe(2240 * ART);
    expect(world.space.height).toBeGreaterThan(1100 * ART);
  });

  it('bakes in a reasonable time', () => {
    // A guard against accidental slowness, not a benchmark: generous for CI.
    expect(elapsed).toBeLessThan(15000);
  });

  it('covers the centre of every tile with opaque pixels', () => {
    for (const { x, y } of townModel.order) {
      expect(pixelAtTile(x, y) >>> 24, `tile (${x}, ${y})`).toBe(255);
    }
  });

  it('is deterministic: baking twice gives the same pixels', () => {
    const again = bakeWorld(townModel, defaultTheme);
    // Compared in a loop: toEqual on ten million numbers would run out of memory
    // building a diff.
    let different = 0;
    for (let i = 0; i < again.buffer.data.length; i++) {
      if (again.buffer.data[i] !== world.buffer.data[i]) different++;
    }
    expect(different).toBe(0);
  });

  it('leaves the corners of the picture empty (sky shows through)', () => {
    expect(world.buffer.get(0, 0)).toBe(0);
    expect(world.buffer.get(world.space.width - 1, 0)).toBe(0);
  });

  it('puts picture origin at the left-most map corner', () => {
    expect(world.space.left).toBe(mapToScreen(0, 60).sx);
  });
});

describe('roads in the baked picture', () => {
  const mats = buildMaterials(defaultTheme);
  const pave = new Set(mats.ramp.pave);
  const dirt = new Set(mats.ramp.dirt);
  const grassAll = new Set(mats.grass.flat());

  function colours(x: number, y: number): Set<number> {
    const set = new Set<number>();
    for (let du = 0.1; du < 1; du += 0.2) for (let dv = 0.1; dv < 1; dv += 0.2) set.add(pixelAtTile(x, y, du, dv));
    return set;
  }

  it('paves a main street with paving colours only', () => {
    // Clock Street runs north-south at x = 37..39; (38, 40) is mid-street, on land.
    expect(townModel.terrain.roadTiles[40]![38]!.kind).toBe('main');
    for (const c of colours(38, 40)) expect(pave.has(c), `#${c.toString(16)}`).toBe(true);
  });

  it('makes a path out of earth colours (with grass creeping in at its edge)', () => {
    const path = townModel.terrain.roadTiles.flatMap((row, y) => row.map((t, x) => ({ t, x, y }))).find(
      ({ t, x, y }) => t?.kind === 'path' && !townModel.terrain.water[y]![x]! && townModel.terrain.roadTiles[y]![x + 1]?.kind === 'path' && townModel.terrain.roadTiles[y]![x - 1]?.kind === 'path',
    )!;
    let earth = 0;
    for (const c of colours(path.x, path.y)) if (dirt.has(c) || pave.has(c) || grassAll.has(c)) earth++;
    expect(earth).toBeGreaterThan(0);
  });

  it('paves the Market Square, including tiles that are not on a street', () => {
    expect(isPlaza(34, 27)).toBe(true);
    expect(townModel.terrain.roads[27]![34]).toBe(false);
    for (const c of colours(34, 27)) expect(pave.has(c)).toBe(true);
  });

  it('leaves open meadow as grass', () => {
    expect(isPlaza(5, 5)).toBe(false);
    for (const c of colours(5, 5)) expect(grassAll.has(c)).toBe(true);
  });

  it('draws bridge decks over the river in plank or stone', () => {
    const plank = new Set(mats.ramp.plank);
    const deck = townModel.terrain.crossings.find((c) => c.kind === 'bridge' && c.road === 'Riverside Footbridge')!;
    let planked = 0;
    for (const c of colours(deck.x, deck.y)) if (plank.has(c)) planked++;
    expect(planked).toBeGreaterThan(0);
  });

  it('draws water in the river tiles', () => {
    const water = new Set(mats.ramp.water);
    const tile = townModel.terrain.water.flatMap((row, y) => row.map((w, x) => ({ w, x, y }))).find(({ w, x, y }) => w && !townModel.terrain.roads[y]![x]! && townModel.shore[y]![x]! >= 2)!;
    for (const c of colours(tile.x, tile.y)) expect(water.has(c)).toBe(true);
  });
});

describe('theme colours', () => {
  it('draws every pixel from the theme (no stray colours)', () => {
    const mats = buildMaterials(defaultTheme);
    const allowed = new Set<number>([mats.outline, mats.white]);
    for (const r of Object.values(mats.ramp)) for (const c of r) allowed.add(c);
    for (const r of mats.grass) for (const c of r) allowed.add(c);
    const seen = new Set<number>();
    const data = world.buffer.data;
    for (let i = 0; i < data.length; i += 37) if (data[i] !== 0) seen.add(data[i]!);
    for (const c of seen) expect(allowed.has(c), `#${c.toString(16)}`).toBe(true);
    expect(hex(defaultTheme.colors.outline)).toBe(mats.outline);
  });
});
