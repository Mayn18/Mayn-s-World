import { describe, expect, it } from 'vitest';
import { CASTLE_KINDS } from '../buildings/castle';
import { SPECIAL_KINDS } from '../buildings/specials';
import { DESIGNED_KINDS } from '../buildings/styles';
import { readDecor } from '../data/decor';
import { townBuildings, townDecor, townWalls } from '../data/loader';
import { townRoadLayer } from '../roads/town';
import { buildScene } from '../buildings/scene';
import { defaultTheme } from '../themes';
import { townModel } from '../terrain/town';
import layout from '../data/layout.json';
import { buildDecorLayer, fenceSegments } from './layer';
import { forestAt, planDecor, tileKey } from './plan';

const plan = planDecor(townModel, townRoadLayer, townBuildings, townWalls, townDecor);

describe('readDecor', () => {
  it('reads every prop, yard and fence in the map file', () => {
    expect(townDecor.props).toHaveLength(128);
    expect(townDecor.yards).toHaveLength(17);
    expect(townDecor.fences).toHaveLength(3);
    expect(townDecor.orchards).toHaveLength(4);
    expect(townDecor.hedgerows).toHaveLength(4);
    expect(townDecor.windbreaks).toHaveLength(3);
    expect(townDecor.fields).toHaveLength(60);
    expect(townDecor.fields[0]).toHaveLength(80);
  });
  it('rejects a prop outside the map', () => {
    const bad = { ...layout, props: [{ t: 'lamp', x: 99, y: 0 }] };
    expect(() => readDecor(bad, 80, 60)).toThrow(/props\[0\]/);
  });
  it('rejects an unknown crop code', () => {
    const rows = [...layout.field_types];
    rows[0] = '9' + rows[0]!.slice(1);
    expect(() => readDecor({ ...layout, field_types: rows }, 80, 60)).toThrow(/unknown crop/);
  });
  it('rejects managed planting locations outside the map', () => {
    const bad = { ...layout, vegetation: { ...layout.vegetation, orchards: [[80, 60]] } };
    expect(() => readDecor(bad, 80, 60)).toThrow(/vegetation\.orchards\[0\]/);
  });
});

describe('every building has a designed look', () => {
  it('is a castle piece, a special, or has a recipe', () => {
    const designed = new Set<string>([...CASTLE_KINDS, ...SPECIAL_KINDS, ...DESIGNED_KINDS]);
    // 'cottage' and the residential kinds are designed; 'stall' etc. are specials.
    const missing = townBuildings.filter((b) => !designed.has(b.kind)).map((b) => `${b.id}:${b.kind}`);
    // Kinds that deliberately use the shared house recipe.
    expect(missing).toEqual([]);
  });
});

describe('plant placement', () => {
  const key = tileKey;
  const footprint = new Set<number>();
  for (const b of townBuildings) for (let y = b.y; y < b.y + b.d; y++) for (let x = b.x; x < b.x + b.w; x++) footprint.add(key(x, y));

  it('never puts a tree or bush on a building, road, square or water, apart from reeds', () => {
    for (const [k, list] of plan.plants) {
      const x = k % 1000;
      const y = Math.floor(k / 1000);
      for (const p of list) {
        if (p.kind === 'reeds' || p.kind === 'willow') continue; // named in the map file
        expect(footprint.has(k)).toBe(false);
        expect(townModel.terrain.roads[y]![x]).toBe(false);
        expect(townRoadLayer.plaza[y]![x]).toBe(false);
        expect(townModel.terrain.water[y]![x]).toBe(false);
      }
    }
  });
  it('keeps the castle courtyard and doorsteps clear', () => {
    for (const [k] of plan.plants) {
      const x = k % 1000;
      const y = Math.floor(k / 1000);
      expect(x >= 8 && x <= 33 && y >= 4 && y <= 14).toBe(false);
    }
    for (const b of townBuildings) if (b.door) expect(plan.plants.has(key(b.door.x, b.door.y))).toBe(false);
  });
  it('keeps plants inside their tile', () => {
    for (const list of plan.plants.values()) {
      for (const p of list) {
        expect(p.ox).toBeGreaterThanOrEqual(0);
        expect(p.ox).toBeLessThanOrEqual(1);
        expect(p.oy).toBeGreaterThanOrEqual(0);
        expect(p.oy).toBeLessThanOrEqual(1);
      }
    }
  });
  it('is repeatable', () => {
    const again = planDecor(townModel, townRoadLayer, townBuildings, townWalls, townDecor);
    expect([...again.plants.entries()]).toEqual([...plan.plants.entries()]);
  });
  it('places mapped orchard, hedgerow and windbreak plants in their intended roles', () => {
    for (const [x, y] of townDecor.orchards) {
      expect(plan.plants.get(key(x, y))?.[0]?.kind, `orchard ${x},${y}`).toBe('blossom');
    }
    for (const [x, y] of townDecor.hedgerows) {
      expect(plan.plants.get(key(x, y))?.[0]?.kind, `hedgerow ${x},${y}`).toBe('hedge');
    }
    for (const [x, y] of townDecor.windbreaks) {
      expect(plan.plants.get(key(x, y))?.[0]?.kind, `windbreak ${x},${y}`).toBe('poplar');
    }
  });
  it('keeps cultivated fields free of opportunistic trees and bushes', () => {
    for (const [k, plants] of plan.plants) {
      const x = k % 1000;
      const y = Math.floor(k / 1000);
      if (townDecor.fields[y]![x] !== 0) {
        expect(plants.map((plant) => plant.kind), `field ${x},${y}`).toEqual(
          expect.not.arrayContaining(['oak', 'spruce', 'poplar', 'blossom', 'bush', 'hedge']),
        );
      }
    }
  });
  it('makes the north-east a forest of mostly conifers and the meadow nearly bare', () => {
    expect(forestAt(45, 5, 80, 60).density).toBeGreaterThan(0.8);
    expect(forestAt(45, 5, 80, 60).conifers).toBeGreaterThan(0.5);
    expect(forestAt(66, 22, 80, 60).density).toBeLessThan(0.1);
  });
  it('feathers the forest edge instead of ending on a straight tile boundary', () => {
    const edgeDensities = [forestAt(34, 12, 80, 60), forestAt(34, 14, 80, 60), forestAt(34, 16, 80, 60)]
      .map(({ density }) => density);
    expect(new Set(edgeDensities).size).toBeGreaterThan(1);
  });
  it('plants reeds or willows along enough open riverbank tiles', () => {
    let waterside = 0;
    for (const [k, plants] of plan.plants) {
      const x = k % 1000;
      const y = Math.floor(k / 1000);
      const besideWater =
        townModel.terrain.water[y - 1]?.[x] === true ||
        townModel.terrain.water[y]?.[x + 1] === true ||
        townModel.terrain.water[y + 1]?.[x] === true ||
        townModel.terrain.water[y]?.[x - 1] === true;
      if (besideWater && plants.some((plant) => plant.kind === 'reeds' || plant.kind === 'willow')) waterside++;
    }
    expect(waterside).toBeGreaterThan(20);
  });
  it('leaves open lawns: most free town tiles carry no tree', () => {
    let free = 0;
    let planted = 0;
    for (let y = 30; y < 45; y++) {
      for (let x = 25; x < 55; x++) {
        if (plan.taken[y]![x] || townModel.terrain.roads[y]![x] || townModel.terrain.water[y]![x] || townRoadLayer.plaza[y]![x]) continue;
        free++;
        if ((plan.plants.get(key(x, y)) ?? []).some((p) => p.kind !== 'bush')) planted++;
      }
    }
    expect(free).toBeGreaterThan(20);
    expect(planted / free).toBeLessThan(0.25);
  });
  it('is dense enough: hundreds of trees in total', () => {
    let trees = 0;
    for (const list of plan.plants.values()) trees += list.filter((p) => p.kind === 'spruce' || p.kind === 'oak').length;
    expect(trees).toBeGreaterThan(500);
  });
});

describe('fences', () => {
  it('leave a gap where a road crosses the fence line', () => {
    const roadAt = (x: number, y: number) => x === 1 && y === 0;
    const segs = fenceSegments([[0, 0, 3, 3]], roadAt);
    expect(segs.has(tileKey(1, 0))).toBe(false); // north edge of tile (1,0) is the gate
    expect(segs.get(tileKey(0, 0))).toEqual(expect.arrayContaining([{ axis: 'x', at: 0 }, { axis: 'y', at: 0 }]));
  });
  it('enclose the pasture on all four sides', () => {
    const segs = fenceSegments([[58, 48, 11, 7]], () => false);
    let count = 0;
    for (const list of segs.values()) count += list.length;
    expect(count).toBe(11 * 2 + 7 * 2);
  });
});

describe('the whole town paints', () => {
  // A context that accepts any drawing call and counts fills, so every painter runs.
  const counts = { fill: 0, fillRect: 0 };
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_t, name: string) => () => {
      if (name === 'fill') counts.fill++;
      if (name === 'fillRect') counts.fillRect++;
    },
    set: () => true,
  });
  it('runs every building, plant, prop and fence painter on every tile without error', () => {
    const decor = buildDecorLayer(townModel, townRoadLayer, townBuildings, townWalls, townDecor);
    const scene = buildScene(townModel, townBuildings, townWalls, undefined, decor);
    expect(scene.placements).toHaveLength(98);
    for (const { x, y } of townModel.order) scene.paintTile(ctx, x, y, defaultTheme);
    expect(counts.fill).toBeGreaterThan(5000);
    expect(counts.fillRect).toBeGreaterThan(1000);
  });
});
