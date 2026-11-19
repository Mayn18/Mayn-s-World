// Pixel shaders for the vertical faces of terrain: retaining walls, cliffs,
// castle foundations, banks and the cut sides of the map.
//
// A face is a parallelogram hanging from the south or east side of a tile. Inside
// it a pixel is described by `t` (0 at the left end, 1 at the right) and `depth`
// (art pixels below the face's top edge at that column). Courses of stone, rock
// strata and grass speckle are all functions of those two numbers.
//
// Light comes from the upper left, so south faces use the lighter ramp steps and
// east faces the darker ones.
import type { Rgba, Shader } from '../pixel/buffer';
import { hash2 } from '../pixel/random';
import type { FaceKind } from '../terrain/edges';
import { LEVEL_PX } from '../render/projection';
import type { Materials } from './materials';
import { ART } from './space';

export type FaceSide = 'south' | 'east';

const LEVEL_ART = LEVEL_PX * ART;

interface FaceGeom {
  // Art x of the face's left and right edges, and art y of its top edge there.
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

function depthAt(g: FaceGeom, ax: number, ay: number): number {
  const t = (ax + 0.5 - g.x0) / (g.x1 - g.x0);
  return ay + 0.5 - (g.y0 + t * (g.y1 - g.y0));
}

// Masonry: courses of blocks with staggered joints.
function masonry(
  ramp: readonly Rgba[],
  lit: boolean,
  ax: number,
  depth: number,
  course: number,
  block: number,
  seed: number,
): Rgba {
  const row = Math.floor(depth / course);
  const within = depth - row * course;
  const offset = (row % 2) * (block / 2);
  const col = Math.floor((ax + offset) / block);
  const across = (ax + offset) - col * block;
  const base = lit ? 2 : 1;
  if (within < 1) return ramp[Math.max(0, base - 1)]!; // mortar line under a course
  if (across < 1) return ramp[Math.max(0, base - 1)]!; // joint between blocks
  const tone = hash2(col, row, seed);
  const shade = base + (tone > 0.8 ? 1 : tone < 0.2 ? -1 : 0);
  // The top row of each block catches the light.
  if (within < 2.2 && lit) return ramp[Math.min(3, shade + 1)]!;
  return ramp[Math.max(0, Math.min(3, shade))]!;
}

export function faceShader(
  kind: FaceKind,
  side: FaceSide,
  geom: FaceGeom,
  mats: Materials,
  grassLevel: number,
  height: number, // face height in art px
): Shader {
  const lit = side === 'south';
  const r = mats.ramp;
  const g = mats.grass[grassLevel]!;

  switch (kind) {
    case 'wall':
      return (ax, ay) => {
        const d = depthAt(geom, ax, ay);
        if (d < 2) return r.pave[lit ? 3 : 2]!; // the cap stones
        if (d > height - 1.5) return r.pave[0]!;
        return masonry(r.pave, lit, ax, d - 2, 6, 12, 5);
      };
    case 'castle':
      return (ax, ay) => {
        const d = depthAt(geom, ax, ay);
        if (d > height - 1.5) return r.stone[0]!;
        return masonry(r.stone, lit, ax, d, 5, 10, 9);
      };
    case 'cliff':
      return (ax, ay) => {
        const d = depthAt(geom, ax, ay);
        const strata = Math.floor(d / LEVEL_ART);
        const intoStratum = d - strata * LEVEL_ART;
        if (d > height - 1.5) return r.rock[0]!;
        if (intoStratum < 1) return r.rock[0]!; // crack between layers
        const cell = hash2(Math.floor(ax / 5), Math.floor(d / 4), 15 + strata);
        const base = lit ? 2 : 1;
        const shade = cell < 0.2 ? base - 1 : cell > 0.82 ? base + 1 : base;
        // lit top edge of each layer
        const edge = intoStratum < 3 && lit ? 1 : 0;
        return r.rock[Math.max(0, Math.min(3, shade + edge))]!;
      };
    case 'slope':
      return (ax, ay) => {
        const d = depthAt(geom, ax, ay);
        const rnd = hash2(ax, ay, 23);
        // The bank darkens a little as it falls away from the lit top edge.
        const dark = d / Math.max(1, height);
        let shade = lit ? 2 : 1;
        if (dark > 0.6) shade -= 1;
        if (rnd < 0.1) shade -= 1;
        else if (rnd > 0.92) shade += 1;
        return g[Math.max(0, Math.min(3, shade))]!;
      };
    case 'bank':
      return (ax, ay) => {
        const d = depthAt(geom, ax, ay);
        const rnd = hash2(ax, ay, 27);
        let shade = lit ? 2 : 1;
        if (d < 2) shade = 3; // dry lip
        else if (d > height - 3) shade = 0; // wet at the waterline
        if (rnd < 0.12) shade -= 1;
        else if (rnd > 0.9) shade += 1;
        return r.dirt[Math.max(0, Math.min(3, shade))]!;
      };
    case 'cascade':
      return (ax, ay) => {
        const streak = hash2(Math.floor(ax / 2), 0, 29);
        const s = streak > 0.6 ? 3 : streak > 0.3 ? 2 : 1;
        return r.water[Math.max(1, lit ? s : s - 1)]!;
      };
    case 'waterSkirt':
      return (ax, ay) => {
        const d = depthAt(geom, ax, ay);
        const band = Math.floor(d / 6);
        const rnd = hash2(ax, band, 33);
        const base = lit ? 1 : 0;
        return r.water[Math.min(3, base + (rnd > 0.85 ? 1 : 0))]!;
      };
    case 'skirt':
    default:
      return (ax, ay) => {
        const d = depthAt(geom, ax, ay);
        // A turf lip on top, then soil in layers with stones.
        if (d < 3) return g[lit ? 2 : 1]!;
        if (d < 4.5) return r.trunk[0]!;
        const layer = Math.floor((d - 4.5) / 7);
        const rnd = hash2(ax, Math.floor(d), 35);
        const base = (layer % 2 === 0 ? 2 : 1) - (lit ? 0 : 1);
        const stone = rnd > 0.965;
        if (stone) return r.rock[lit ? 2 : 1]!;
        return r.trunk[Math.max(0, Math.min(3, base + (rnd < 0.12 ? -1 : rnd > 0.9 ? 1 : 0)))]!;
      };
  }
}

// A ramp or flight of stairs laid over a face: the road surface seen climbing.
export function climbShader(
  kind: 'ramp' | 'stairs',
  paved: boolean,
  side: FaceSide,
  geom: FaceGeom,
  mats: Materials,
): Shader {
  const ramp = paved ? mats.ramp.pave : mats.ramp.dirt;
  const lit = side === 'south';
  return (ax, ay) => {
    const d = depthAt(geom, ax, ay);
    const t = (ax + 0.5 - geom.x0) / (geom.x1 - geom.x0);
    if (kind === 'stairs') {
      const step = Math.floor(d / 4);
      const within = d - step * 4;
      // tread (lit, flat) then riser (shaded) for each step
      if (within < 2) return mats.ramp.stone[3]!;
      return mats.ramp.stone[lit ? 1 : 0]!;
    }
    // A ramp: the road surface, slightly shaded as it falls away, with worn edges.
    const rnd = hash2(ax, ay, 37);
    let shade = lit ? 3 : 2;
    if (t < 0.06 || t > 0.94) shade = 1;
    else if (rnd < 0.12) shade -= 1;
    else if (rnd > 0.92) shade = Math.min(3, shade + 1);
    return ramp[Math.max(0, shade)]!;
  };
}
