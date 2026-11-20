// Decides where plants, rocks and small figures go. Pure data in, a list of placed
// things out: no canvas here, so the rules are easy to test.
//
// The map file only names willows and reeds. Forests, lawn trees, orchards and rocks
// are placed here from rules read off the Stage 2 v2 aerial view:
//   - dense forest on the northern highlands, behind and east of the castle, with
//     spruce and pine mostly, and along the west edge, with broadleaf trees mostly
//   - an open eastern meadow with only a few trees and rocks, and a pine fringe on
//     the far east edge
//   - sparse trees on town lawns, a little more beside houses
//   - a few boulders along the castle wall
// Nothing is placed on roads, the square, water, buildings, walls, yards, fences,
// props or the castle courtyard, and every choice comes from a hash of the tile
// position, so the town looks the same on every load.
import type { Building } from '../data/buildings';
import type { DecorData } from '../data/decor';
import { hash2 } from '../buildings/random';
import type { RoadLayer } from '../roads/roadLayer';
import type { TerrainModel } from '../terrain/model';
import type { PlantKind } from './plants';

export type FigureKind = 'villager';

export interface PlacedPlant {
  kind: PlantKind;
  // Position inside the tile, 0 to 1 east and south.
  ox: number;
  oy: number;
  // Repeatable 0..1 variation (colour, height).
  v: number;
  // Size multiplier.
  s: number;
}

export interface PlacedFigure {
  ox: number;
  oy: number;
  v: number;
}

export interface DecorPlan {
  plants: Map<number, PlacedPlant[]>;
  figures: Map<number, PlacedFigure[]>;
  // True where something solid (a building, wall, prop, yard) stands, so other layers
  // can keep clear.
  taken: boolean[][];
}

export const tileKey = (x: number, y: number) => y * 1000 + x;

interface Forest {
  density: number;
  // Share of conifers among the trees.
  conifers: number;
}

// How wooded a tile is, from 0 (lawn) to about 0.9 (dense forest).
export function forestAt(x: number, y: number, width: number, height: number): Forest {
  void height;
  let density = 0;
  let conifers = 0.4;
  // Highlands north of the castle and the whole north edge.
  if (y <= 3) {
    density = 0.88;
    conifers = 0.55;
  }
  // The great northern and north-eastern forest.
  if (x >= 34 && y <= 13) {
    density = Math.max(density, 0.86);
    conifers = 0.62;
  } else if (x >= 40 && y <= 18) {
    density = Math.max(density, 0.7 - (y - 13) * 0.08);
    conifers = 0.6;
  }
  // The west edge: broadleaf woods running down the whole side.
  if (x <= 3) {
    density = Math.max(density, 0.9);
    conifers = 0.3;
  } else if (x <= 6 && y >= 14) {
    density = Math.max(density, 0.7);
    conifers = 0.32;
  } else if (x <= 5) {
    density = Math.max(density, 0.65);
    conifers = 0.4;
  }
  // The far east fringe: spruce only, thin.
  if (x >= width - 4 && y >= 14 && y <= 52) {
    density = Math.max(density, 0.42);
    conifers = 0.92;
  }
  // The open eastern meadow keeps its lawn.
  if (x >= 58 && x <= width - 5 && y >= 14 && y <= 31) {
    density = Math.min(density, 0.05);
    conifers = 0.5;
  }
  return { density, conifers };
}

function buildingTiles(buildings: Building[]): Set<number> {
  const set = new Set<number>();
  for (const b of buildings) for (let y = b.y; y < b.y + b.d; y++) for (let x = b.x; x < b.x + b.w; x++) set.add(tileKey(x, y));
  return set;
}

function pickTree(conifers: number, r1: number, r2: number): PlantKind {
  if (r1 < conifers) return r2 < 0.78 ? 'spruce' : r2 < 0.9 ? 'poplar' : 'umbrella';
  const r = r2;
  if (r < 0.62) return 'oak';
  if (r < 0.74) return 'birch';
  if (r < 0.82) return 'poplar';
  if (r < 0.9) return 'umbrella';
  return r < 0.96 ? 'autumn' : 'oak';
}

export function planDecor(
  model: TerrainModel,
  roads: RoadLayer,
  buildings: Building[],
  walls: { points: [number, number][] }[],
  decor: DecorData,
): DecorPlan {
  const { width, height, water } = model.terrain;
  const key = tileKey;
  const footprints = buildingTiles(buildings);
  const taken: boolean[][] = Array.from({ length: height }, () => Array<boolean>(width).fill(false));
  const mark = (x: number, y: number) => {
    if (x >= 0 && y >= 0 && x < width && y < height) taken[y]![x] = true;
  };

  for (const k of footprints) mark(k % 1000, Math.floor(k / 1000));
  for (const { points } of walls) {
    for (let i = 0; i + 1 < points.length; i++) {
      const [x0, y0] = points[i]!;
      const [x1, y1] = points[i + 1]!;
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) mark(x, y);
    }
  }
  // The castle courtyard stays open: it has its own flower beds, not woodland.
  for (let y = 4; y <= 14; y++) for (let x = 8; x <= 33; x++) mark(x, y);
  for (const p of decor.props) mark(p.x, p.y);
  for (const y of decor.yards) for (let j = y.y; j < y.y + y.d; j++) for (let i = y.x; i < y.x + y.w; i++) mark(i, j);
  for (const b of buildings) if (b.door) mark(b.door.x, b.door.y);
  for (const [x, y, w, d] of decor.fences) {
    for (let i = x; i < x + w; i++) {
      mark(i, y);
      mark(i, y + d - 1);
    }
    for (let j = y; j < y + d; j++) {
      mark(x, j);
      mark(x + w - 1, j);
    }
  }

  const paved = (x: number, y: number) =>
    model.terrain.roads[y]![x]! || roads.plaza[y]![x]! || roads.decks[y]![x]! || water[y]![x]!;
  const free = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && !taken[y]![x]! && !paved(x, y);

  const nearBuilding = (x: number, y: number) => {
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (footprints.has(key(x + i, y + j))) return true;
    return false;
  };
  const nearWater = (x: number, y: number, r: number) => {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (water[y + j]?.[x + i]) return true;
    return false;
  };

  const plants = new Map<number, PlacedPlant[]>();
  const add = (x: number, y: number, p: PlacedPlant) => {
    const list = plants.get(key(x, y)) ?? [];
    list.push(p);
    plants.set(key(x, y), list);
  };
  const castleTile = (x: number, y: number) => x >= 7 && x <= 34 && y >= 3 && y <= 15;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!free(x, y)) continue;
      const h = (n: number) => hash2(x, y, n);
      const { density, conifers } = forestAt(x, y, width, height);
      const near = nearBuilding(x, y);
      const lakeside = nearWater(x, y, 2);

      if (density > 0.1) {
        const count = h(1) < density ? (h(2) < density * 0.55 ? 2 : 1) : 0;
        for (let i = 0; i < count; i++) {
          const kind = pickTree(conifers, h(3 + i), h(5 + i));
          add(x, y, { kind, ox: 0.2 + h(7 + i) * 0.6, oy: 0.2 + h(9 + i) * 0.6, v: h(11 + i), s: kind === 'spruce' ? 0.85 + h(13 + i) * 0.5 : 0.8 + h(13 + i) * 0.4 });
        }
        if (h(15) < density * 0.3) add(x, y, { kind: 'bush', ox: 0.15 + h(16) * 0.7, oy: 0.15 + h(17) * 0.7, v: h(18), s: 1 });
        continue;
      }

      // Lawns: trees stay sparse so open grass remains, a little more beside houses.
      const chance = (near ? 0.1 : 0.028) + (lakeside ? 0.06 : 0) + density * 0.5;
      if (h(20) < chance) {
        const r = h(21);
        const kind: PlantKind = lakeside && r < 0.12 ? 'willow' : r < 0.1 ? 'blossom' : r < 0.78 ? 'oak' : r < 0.84 ? 'poplar' : 'bush';
        add(x, y, { kind, ox: 0.25 + h(22) * 0.5, oy: 0.25 + h(23) * 0.5, v: h(24), s: kind === 'bush' ? 1 : 0.75 + h(25) * 0.35 });
      } else if (near && h(26) < 0.22) {
        add(x, y, { kind: 'bush', ox: 0.2 + h(27) * 0.6, oy: 0.25 + h(28) * 0.5, v: h(29), s: 0.9 });
      } else if (!near && h(30) < (density > 0 ? 0.03 : 0.012)) {
        // Rocks and cut logs in the meadows, and boulders under the castle hill.
        add(x, y, { kind: h(31) < 0.7 ? 'rock' : 'log', ox: 0.3 + h(32) * 0.4, oy: 0.3 + h(33) * 0.4, v: h(34), s: 1 });
      }
      if (castleTile(x, y) && h(40) < 0.35 && !(x >= 8 && x <= 33 && y >= 4 && y <= 14)) {
        add(x, y, { kind: 'rock', ox: 0.5, oy: 0.55, v: h(41), s: 1.15 });
      }
    }
  }

  // Willows and reeds named in the map file.
  for (const [x, y] of decor.willows) if (!footprints.has(key(x, y))) add(x, y, { kind: 'willow', ox: 0.5, oy: 0.5, v: hash2(x, y, 50), s: 1 });
  for (const [x, y] of decor.reeds) if (!footprints.has(key(x, y))) add(x, y, { kind: 'reeds', ox: 0.5, oy: 0.55, v: hash2(x, y, 51), s: 1 });

  // A few villagers on the streets and the square.
  const figures = new Map<number, PlacedFigure[]>();
  let count = 0;
  for (let y = 0; y < height && count < 22; y++) {
    for (let x = 0; x < width && count < 22; x++) {
      const tile = model.terrain.roadTiles[y]![x];
      const onSquare = roads.plaza[y]![x]!;
      if (water[y]![x]! || (!onSquare && (!tile || tile.kind === 'pier' || tile.kind === 'path'))) continue;
      if (castleTile(x, y) || footprints.has(key(x, y))) continue;
      if (hash2(x, y, 60) < (onSquare ? 0.035 : 0.028)) {
        figures.set(key(x, y), [{ ox: 0.3 + hash2(x, y, 61) * 0.4, oy: 0.3 + hash2(x, y, 62) * 0.4, v: hash2(x, y, 63) }]);
        count++;
      }
    }
  }

  return { plants, figures, taken };
}
