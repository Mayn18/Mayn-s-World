import { describe, expect, it } from 'vitest';
import { townBuildings, townWalls } from '../data/loader';
import { townModel } from '../terrain/town';
import { doorPlacement, roofHeightAt, windowCentres } from './painter';
import { REVIEW_IDS, buildScene, wallTiles } from './scene';
import { appearanceFor } from './styles';

const byId = (id: number) => townBuildings.find((b) => b.id === id)!;

describe('doorPlacement', () => {
  it('puts a door south of the footprint on the south wall', () => {
    expect(doorPlacement(byId(0))).toEqual({ face: 'south', u: 3.5 });
  });
  it('puts a door east of the footprint on the east wall', () => {
    expect(doorPlacement(byId(3))?.face).toBe('east');
  });
  it('hides doors that face away from the viewer', () => {
    expect(doorPlacement(byId(57))).toBeNull();
  });
});

describe('windowCentres', () => {
  it('spaces windows evenly inside the wall', () => {
    const c = windowCentres(0, 4, 1);
    expect(c).toEqual([0.5, 1.5, 2.5, 3.5]);
  });
});

describe('appearance', () => {
  it('is repeatable and keeps every volume inside its footprint', () => {
    for (const b of townBuildings) {
      if (['tower', 'keep', 'gate'].includes(b.kind)) continue;
      const a = appearanceFor(b);
      expect(appearanceFor(b)).toEqual(a);
      for (const v of a.volumes) {
        expect(v.x0).toBeGreaterThanOrEqual(0);
        expect(v.y0).toBeGreaterThanOrEqual(0);
        expect(v.x1).toBeLessThanOrEqual(b.w + 1e-9);
        expect(v.y1).toBeLessThanOrEqual(b.d + 1e-9);
      }
    }
  });
  it('has a roof above the walls', () => {
    const a = appearanceFor(byId(51));
    const v = a.volumes[0]!;
    expect(roofHeightAt(a, v, (v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2)).toBeGreaterThan(v.floors * a.floorPx);
  });
});

describe('scene', () => {
  const scene = buildScene(townModel, townBuildings, townWalls, REVIEW_IDS);
  it('places only the review buildings, on their terrain level', () => {
    expect(scene.placements.length).toBe(REVIEW_IDS.size);
    for (const p of scene.placements) {
      expect(p.origin.level).toBe(townModel.terrain.levels[p.building.y]![p.building.x]);
    }
  });
  it('reaches above the terrain', () => {
    expect(scene.top).toBeLessThan(0);
  });
  it('turns wall runs into axis-aligned tiles', () => {
    const tiles = wallTiles([{ points: [[8, 4], [10, 4]] }]);
    expect(tiles).toHaveLength(3);
    expect(tiles.every((t) => t.along === 'x')).toBe(true);
  });
  it('includes the curtain wall with the castle', () => {
    expect(scene.walls.length).toBeGreaterThan(0);
  });
});

describe('depth order', () => {
  const scene = buildScene(townModel, townBuildings, townWalls);
  const index = new Map(townModel.order.map((t, i) => [`${t.x},${t.y}`, i]));
  it('draws every building after all the ground it stands on and behind it', () => {
    for (const { building: b } of scene.placements) {
      const anchor = index.get(`${b.x + b.w - 1},${b.y + b.d - 1}`)!;
      for (let y = b.y; y < b.y + b.d; y++) {
        for (let x = b.x; x < b.x + b.w; x++) expect(index.get(`${x},${y}`)!).toBeLessThanOrEqual(anchor);
      }
    }
  });
  it('places every one of the 102 footprints on its own terrain level', () => {
    expect(scene.placements).toHaveLength(102);
    for (const p of scene.placements) expect(p.origin.level).toBe(townModel.terrain.levels[p.building.y]![p.building.x]);
  });
});
