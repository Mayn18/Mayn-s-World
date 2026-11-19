// Pixel shaders for the flat tops of tiles: grass, roads, paving and water.
//
// A "shader" here is a function from one art pixel to a colour. For each tile
// the painter asks, per pixel: where am I inside this tile (u, v from 0 to 1,
// measured along the map's x and y axes), and what colour should that spot be?
// Working in (u, v) rather than screen x and y is what makes cobbles, planks and
// kerbs line up with the isometric grid instead of the screen.
import { type Rgba, type Shader } from '../pixel/buffer';
import { hash2 } from '../pixel/random';
import { screenToMap } from '../render/projection';
import type { RoadKind } from '../data/types';
import type { TerrainModel } from '../terrain/model';
import { WATER_STEPS } from '../render/terrainPalette';
import type { Materials } from './materials';
import { ART, type ArtSpace, fromArt } from './space';

export interface GroundContext {
  model: TerrainModel;
  mats: Materials;
  space: ArtSpace;
  plaza: boolean[][];
}

// The four sides of a tile: which neighbour, and how far a point (u, v) is from
// that side (0 on the side, 1 on the opposite one).
const SIDES = [
  { dx: -1, dy: 0, distance: (u: number) => u },
  { dx: 1, dy: 0, distance: (u: number) => 1 - u },
  { dx: 0, dy: -1, distance: (_u: number, v: number) => v },
  { dx: 0, dy: 1, distance: (_u: number, v: number) => 1 - v },
] as const;

// A road tile's kind, or null if the tile is not a road on land.
export function landRoadKind(model: TerrainModel, x: number, y: number): RoadKind | 'plaza' | null {
  const road = model.terrain.roadTiles[y]?.[x];
  if (road && !model.terrain.water[y]![x]!) return road.kind === 'pier' ? null : road.kind;
  return null;
}

function groundKind(ctx: GroundContext, x: number, y: number): RoadKind | 'plaza' | null {
  if (ctx.plaza[y]?.[x]) return 'plaza';
  return landRoadKind(ctx.model, x, y);
}

// Cobbles: a staggered grid of stones in (u, v). `cells` is stones per tile edge.
// Returns a colour from a paving ramp: joints dark, stones in three shades with a
// highlight on each stone's near-left edge.
export function cobble(
  ramp: readonly Rgba[],
  u: number,
  v: number,
  cells: number,
  seed: number,
): Rgba {
  const row = Math.floor(v * cells);
  const cu = u * cells + (row % 2) * 0.5;
  const col = Math.floor(cu);
  const fu = cu - col;
  const fv = v * cells - row;
  // A tile edge is about 36 art pixels long, so a stone is 36 / cells pixels wide
  // and one pixel of joint is cells / 36 of a stone.
  const joint = cells / 36;
  if (fu < joint * 0.6 || fv < joint) return ramp[0]!;
  const tone = hash2(col, row, seed);
  const shade = tone < 0.18 ? 1 : tone < 0.7 ? 2 : 3;
  // light from the upper left: the stone's own top-left corner catches it
  if (fu < joint * 1.8 || fv < joint * 1.8) return ramp[Math.min(3, shade + 1)]!;
  return ramp[shade]!;
}

// Packed earth with pebbles and the occasional flagstone patch.
function dirt(ctx: GroundContext, ax: number, ay: number, u: number, v: number, x: number, y: number, worn: boolean): Rgba {
  const ramp = ctx.mats.ramp.dirt;
  const r = hash2(ax, ay, 11);
  if (worn) {
    // low-frequency patches of old paving showing through
    const patch = hash2(Math.floor((x + u) * 3), Math.floor((y + v) * 3), 7);
    if (patch > 0.62) return cobble(ctx.mats.ramp.pave, u, v, 4, 3);
  }
  if (r < 0.05) return ramp[0]!;
  if (r < 0.17) return ramp[1]!;
  if (r > 0.94) return ctx.mats.ramp.pave[3]!;
  if (r > 0.8) return ramp[3]!;
  return ramp[2]!;
}

export function grassPixel(ctx: GroundContext, level: number, ax: number, ay: number): Rgba {
  const g = ctx.mats.grass[level]!;
  // Broad patches of lighter and darker meadow, then fine speckle on top.
  const patch = hash2(Math.floor(ax / 11), Math.floor(ay / 7), 5);
  const r = hash2(ax, ay, 3);
  let shade = patch < 0.22 ? 1 : patch > 0.78 ? 3 : 2;
  if (r < 0.06) shade = Math.max(0, shade - 1);
  else if (r > 0.95) shade = Math.min(3, shade + 1);
  return g[shade]!;
}

// The colour of a road or paving pixel of the given kind at (u, v).
function surface(ctx: GroundContext, kind: RoadKind | 'plaza', ax: number, ay: number, u: number, v: number, x: number, y: number): Rgba {
  switch (kind) {
    case 'plaza':
      return cobble(ctx.mats.ramp.pave, u, v, 3, 17);
    case 'main':
      return cobble(ctx.mats.ramp.pave, u, v, 5, 13);
    case 'lane':
      return dirt(ctx, ax, ay, u, v, x, y, true);
    case 'path':
      return dirt(ctx, ax, ay, u, v, x, y, false);
    default:
      return ctx.mats.ramp.dirt[2]!;
  }
}

// The top of a land tile.
export function landShader(ctx: GroundContext, x: number, y: number): Shader {
  const { model, mats, space } = ctx;
  const level = model.terrain.levels[y]![x]!;
  const surf = model.surface[y]![x]!;
  const here = groundKind(ctx, x, y);
  const neighbours = SIDES.map((s) => groundKind(ctx, x + s.dx, y + s.dy));

  return (ax, ay) => {
    const p = fromArt(space, ax + 0.5, ay + 0.5);
    const m = screenToMap(p.sx, p.sy, surf);
    const u = Math.min(1, Math.max(0, m.x - x));
    const v = Math.min(1, Math.max(0, m.y - y));

    if (here) {
      // Distance to the nearest side that is NOT paved: the edge of the road.
      let edge = 1;
      for (let i = 0; i < 4; i++) {
        if (neighbours[i] === null) edge = Math.min(edge, SIDES[i]!.distance(u, v));
      }
      const hard = here === 'main' || here === 'plaza';
      if (hard) {
        // A crisp kerb: a dark line on the outer edge and a light one inside it.
        const kerb = 1.6 / (ART * 16);
        if (edge < kerb) return mats.ramp.pave[0]!;
        if (edge < kerb * 2.2) return mats.ramp.pave[3]!;
      } else {
        // A ragged edge: grass creeps onto the track, in a noisy band.
        const wobble = hash2(ax, ay, 21) * 0.16;
        if (edge < wobble) return grassPixel(ctx, level, ax, ay);
      }
      return surface(ctx, here, ax, ay, u, v, x, y);
    }

    // Grass. Beside a road or square it picks up dust and pebbles.
    for (let i = 0; i < 4; i++) {
      const n = neighbours[i];
      if (n === null) continue;
      const d = SIDES[i]!.distance(u, v);
      if (d < 0.14 && n !== 'main' && n !== 'plaza') {
        if (hash2(ax, ay, 31) < ((0.14 - d) / 0.14) * 0.5) return mats.ramp.dirt[hash2(ax, ay, 32) > 0.6 ? 1 : 2]!;
      }
    }
    return grassPixel(ctx, level, ax, ay);
  };
}

// The top of a water tile: shaded by distance from the shore, pale foam where it
// meets land, scattered glints.
export function waterShader(ctx: GroundContext, x: number, y: number): Shader {
  const { model, mats, space } = ctx;
  const surf = model.surface[y]![x]!;
  const step = Math.min(WATER_STEPS, Math.max(1, model.shore[y]![x]!)) - 1; // 0 shallow .. 3 deep
  const ramp = mats.ramp.water;
  const landSide = SIDES.map((s) => model.terrain.water[y + s.dy]?.[x + s.dx] === false);

  return (ax, ay) => {
    const p = fromArt(space, ax + 0.5, ay + 0.5);
    const m = screenToMap(p.sx, p.sy, surf);
    const u = Math.min(1, Math.max(0, m.x - x));
    const v = Math.min(1, Math.max(0, m.y - y));
    for (let i = 0; i < 4; i++) {
      if (!landSide[i]) continue;
      const d = SIDES[i]!.distance(u, v);
      if (d < 0.07) return ramp[3]!; // foam line
      if (d < 0.17 && hash2(ax, ay, 41) < 0.4) return ramp[3]!;
    }
    const r = hash2(ax, ay, 43);
    // Long horizontal glints, like ripples, rather than single dots.
    const streak = hash2(Math.floor(ax / 5), ay, 44);
    if (streak > 0.93 && ax % 5 < 3) return step === 0 ? ramp[3]! : ramp[2]!;
    if (step === 0) return r < 0.12 ? ramp[1]! : ramp[2]!;
    if (step === 1) return r > 0.6 ? ramp[1]! : ramp[2]!;
    if (step === 2) return r < 0.1 ? ramp[2]! : ramp[1]!;
    return r > 0.75 ? ramp[0]! : ramp[1]!;
  };
}
