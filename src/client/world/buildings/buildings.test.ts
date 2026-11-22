import { describe, expect, it } from 'vitest';
import { townBuildings, townDecor, townWalls } from '../data/loader';
import { townModel } from '../terrain/town';
import { castleHeight, towerSpec } from './castle';
import { SPECIAL_KINDS, specialHeight } from './specials';
import { doorPlacement, roofHeightAt, windowCentres } from './painter';
import { REVIEW_IDS, buildScene, wallTiles } from './scene';
import { appearanceFor, appearanceForTown, familyFor, neighbourRuleHolds } from './styles';

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
      if (['tower', 'keep', 'gate', ...SPECIAL_KINDS].includes(b.kind)) continue;
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
    const a = appearanceFor(byId(55));
    const v = a.volumes[0]!;
    expect(roofHeightAt(a, v, (v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2)).toBeGreaterThan(v.floors * a.floorPx);
  });
  it('maps the existing kinds onto all six named architectural families', () => {
    const families = new Set(townBuildings.map(familyFor));
    expect(families).toEqual(new Set([
      'gabled-burgher',
      'long-hall',
      'corner-merchant',
      'stepped-gable-row',
      'workshop',
      'inn-tavern',
    ]));
  });
  it('holds the within-three-tile neighbour rule for the town set', () => {
    const appearances = appearanceForTown(townBuildings);
    expect(neighbourRuleHolds(townBuildings, appearances)).toBe(true);
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
  it('renders the Terrace Cathedral inside its approved site as a tall special landmark', () => {
    const cathedral = byId(17);
    expect(cathedral).toMatchObject({
      name: 'Terrace Cathedral',
      kind: 'cathedral',
      x: 18,
      y: 21,
      w: 5,
      d: 8,
      door: { x: 20, y: 29 },
    });
    expect(townBuildings.filter((building) => ['chapel', 'cathedral'].includes(building.kind))).toEqual([cathedral]);
    expect(townBuildings.some((building) => [51, 52, 53, 74].includes(building.id))).toBe(false);
    expect(townDecor.props).not.toContainEqual({ t: 'barrel', x: 19, y: 21 });
    expect(townDecor.props).not.toContainEqual({ t: 'barrel', x: 21, y: 24 });
    const placement = buildScene(townModel, [cathedral], []).placements[0]!;
    expect(placement.appearance).toBeNull();
    expect(placement.height).toBeGreaterThan(specialHeight(byId(6)));
  });
  it('keeps the Cathedral footprint clear of roads and connects its south door to Cottage Road', () => {
    const cathedral = byId(17);
    for (let y = cathedral.y; y < cathedral.y + cathedral.d; y++) {
      for (let x = cathedral.x; x < cathedral.x + cathedral.w; x++) {
        expect(townModel.terrain.roadTiles[y]![x], `road at ${x},${y}`).toBeNull();
      }
    }

    for (const [x, y] of [[17, 28], [17, 29], [18, 29], [19, 29], [20, 29]]) {
      expect(townModel.terrain.roadTiles[y]![x], `entrance route at ${x},${y}`).not.toBeNull();
    }
    expect(townModel.terrain.roadTiles[29]![20]?.kind).toBe('main');
  });
  it('keeps the small churchyard on open ground beside the Cathedral', () => {
    const yard = townDecor.yards.find((entry) => entry.of === 17);
    if (!yard) throw new Error('Cathedral churchyard is missing');
    expect(yard).toEqual({ x: 15, y: 25, w: 2, d: 4, side: 'W', of: 17 });
    for (let y = yard.y; y < yard.y + yard.d; y++) {
      for (let x = yard.x; x < yard.x + yard.w; x++) {
        expect(townModel.terrain.roadTiles[y]![x], `churchyard road at ${x},${y}`).toBeNull();
      }
    }
  });
  it('keeps all building footprints non-overlapping', () => {
    for (let i = 0; i < townBuildings.length; i++) {
      const a = townBuildings[i]!;
      for (let j = i + 1; j < townBuildings.length; j++) {
        const b = townBuildings[j]!;
        const overlaps = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.d && b.y < a.y + a.d;
        expect(overlaps, `buildings ${a.id} and ${b.id}`).toBe(false);
      }
    }
  });
});

describe('castle silhouette', () => {
  it('makes the keep taller than each tower while keeping tower profiles varied', () => {
    const keep = townBuildings.find((b) => b.kind === 'keep')!;
    const towers = townBuildings.filter((b) => b.kind === 'tower');
    const towerHeights = towers.map(castleHeight);

    expect(castleHeight(keep)).toBeGreaterThan(Math.max(...towerHeights));
    expect(new Set(towerHeights).size).toBeGreaterThan(1);
    const towerStyles = new Set(townBuildings.filter((b) => b.kind === 'tower').map(towerSpec).map((spec) => spec.style));
    expect(towerStyles.size).toBeGreaterThanOrEqual(4);
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
  it('places every one of the 98 footprints on its own terrain level', () => {
    expect(scene.placements).toHaveLength(98);
    for (const p of scene.placements) expect(p.origin.level).toBe(townModel.terrain.levels[p.building.y]![p.building.x]);
  });
});
