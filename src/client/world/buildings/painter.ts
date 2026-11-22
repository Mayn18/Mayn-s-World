// Draws one building from grid-snapped surfaces and material-specific pixel detail.
//
// Light comes from the upper left (south faces and south roof planes lit, east ones
// shaded). The viewer is south-east, so only those visible walls and roof planes draw.
//
// A building is a few volumes (boxes with roofs) drawn back to front, then its extras
// (clock faces, a dome, a flag).
import type { Building } from '../data/buildings';
import type { ScreenPoint } from '../render/projection';
import {
  fillPixelPolygon as fillPolygon,
  paintPixelCourses,
  strokePixelLine as strokeLine,
  strokePixelPolygon,
} from '../render/pixelArt';
import { mix } from '../render/terrainPalette';
import { type Origin, at } from './geometry';
import { hash2 } from './random';
import type { BuildingPalette, Tone } from './palette';
import type { Appearance, Extra, Volume } from './style';

const OVERHANG = 0.12; // tiles the roof reaches beyond the wall
const PX_PER_RUN = 14; // roof rise per tile of run at pitch 1
const PLINTH_PX = 2.4;
const DOOR_HALF = 0.19; // tiles
const DOOR_PX = 8.5;
const WIN_HALF = 0.115; // tiles

export type Face = 'south' | 'east';

export interface DoorPlacement {
  face: Face;
  // Position along that wall: mx for a south wall, my for an east wall.
  u: number;
}

// Which wall an entrance is on, and where. The file gives the tile just outside the
// door. If it lies south of the footprint the door is on the south wall; if east, on
// the east wall; north or west entrances face away from the viewer and cannot be seen.
export function doorPlacement(b: Building): DoorPlacement | null {
  if (!b.door) return null;
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  if (b.door.y >= b.y + b.d && b.door.x >= b.x - 1 && b.door.x <= b.x + b.w) {
    return { face: 'south', u: clamp(b.door.x + 0.5 - b.x, 0.45, b.w - 0.45) };
  }
  if (b.door.x >= b.x + b.w && b.door.y >= b.y - 1 && b.door.y <= b.y + b.d) {
    return { face: 'east', u: clamp(b.door.y + 0.5 - b.y, 0.45, b.d - 0.45) };
  }
  return null;
}

// Window centres along a wall from `lo` to `hi`.
export function windowCentres(lo: number, hi: number, spacing: number): number[] {
  const n = Math.max(1, Math.round((hi - lo) / spacing));
  return Array.from({ length: n }, (_, i) => lo + ((i + 0.5) * (hi - lo)) / n);
}

function floorPxOf(app: Appearance, vol: Volume): number {
  return vol.floorPx ?? app.floorPx;
}

export function wallHeight(app: Appearance, vol: Volume): number {
  return vol.floors * floorPxOf(app, vol);
}

function ridgeAlongX(vol: Volume): boolean {
  const w = vol.x1 - vol.x0;
  const d = vol.y1 - vol.y0;
  if (vol.roofShape === 'gable') return (vol.ridge ?? (w >= d ? 'x' : 'y')) === 'x';
  return w >= d;
}

function roofRise(vol: Volume): number {
  const run = Math.min(vol.x1 - vol.x0, vol.y1 - vol.y0) / 2 + OVERHANG;
  return (vol.pitch ?? 0.55) * run * PX_PER_RUN;
}

// Height of a volume's roof above the ground at a point, in px.
export function roofHeightAt(app: Appearance, vol: Volume, mx: number, my: number): number {
  const H = wallHeight(app, vol);
  const w = vol.x1 - vol.x0;
  const d = vol.y1 - vol.y0;
  if (vol.roofShape === 'flat') return H + 3;
  const R = roofRise(vol);
  const run = Math.min(w, d) / 2 + OVERHANG;
  if (vol.roofShape === 'gable') {
    if (ridgeAlongX(vol)) return H + Math.max(0, R * (1 - Math.abs(my - (vol.y0 + d / 2)) / (d / 2 + OVERHANG)));
    return H + Math.max(0, R * (1 - Math.abs(mx - (vol.x0 + w / 2)) / (w / 2 + OVERHANG)));
  }
  const edge = Math.min(my - vol.y0 + OVERHANG, vol.y1 + OVERHANG - my, mx - vol.x0 + OVERHANG, vol.x1 + OVERHANG - mx);
  return H + Math.max(0, Math.min(1, edge / run)) * R;
}

// A box: south face, east face and top.
export function box(
  ctx: CanvasRenderingContext2D,
  o: Origin,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z0: number,
  z1: number,
  tone: Tone,
  topColour = tone.light,
): void {
  const south = [at(o, x0, y1, z0), at(o, x1, y1, z0), at(o, x1, y1, z1), at(o, x0, y1, z1)];
  const east = [at(o, x1, y1, z0), at(o, x1, y0, z0), at(o, x1, y0, z1), at(o, x1, y1, z1)];
  const top = [at(o, x0, y0, z1), at(o, x1, y0, z1), at(o, x1, y1, z1), at(o, x0, y1, z1)];
  fillPolygon(ctx, south, tone.lit);
  fillPolygon(ctx, east, tone.shade);
  fillPolygon(ctx, top, topColour);
  strokePixelPolygon(ctx, south, tone.dark);
  strokePixelPolygon(ctx, east, tone.dark);
  strokePixelPolygon(ctx, top, tone.dark);
}

// A point on a wall: `u` along it, `z` up it.
function wallPoint(o: Origin, vol: Volume, face: Face, u: number, z: number): ScreenPoint {
  return face === 'south' ? at(o, u, vol.y1, z) : at(o, vol.x1, u, z);
}

function wallQuad(o: Origin, vol: Volume, face: Face, u0: number, u1: number, z0: number, z1: number): ScreenPoint[] {
  return [wallPoint(o, vol, face, u0, z0), wallPoint(o, vol, face, u1, z0), wallPoint(o, vol, face, u1, z1), wallPoint(o, vol, face, u0, z1)];
}

// A disc lying on a wall (a clock face), as a polygon.
function wallDisc(o: Origin, vol: Volume, face: Face, u: number, z: number, r: number): ScreenPoint[] {
  const pts: ScreenPoint[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    pts.push(wallPoint(o, vol, face, u + (r * Math.cos(a)) / 16, z + r * Math.sin(a)));
  }
  return pts;
}

function paintWalls(
  ctx: CanvasRenderingContext2D,
  o: Origin,
  vol: Volume,
  app: Appearance,
  pal: BuildingPalette,
  door: DoorPlacement | null,
  doorHere: boolean,
): void {
  const wall = pal.m[vol.wall ?? app.wall];
  const H = wallHeight(app, vol);
  const fpx = floorPxOf(app, vol);
  const pl = app.plinth ? PLINTH_PX : 0;
  const stone = pal.m.wallStone;
  const timber = pal.m.wallTimber;
  const glass = pal.glass;

  for (const face of ['south', 'east'] as const) {
    const lit = face === 'south';
    const lo = face === 'south' ? vol.x0 : vol.y0;
    const hi = face === 'south' ? vol.x1 : vol.y1;
    // The wall itself.
    const wallFace = wallQuad(o, vol, face, lo, hi, 0, H);
    fillPolygon(ctx, wallFace, lit ? wall.lit : wall.shade);
    strokePixelPolygon(ctx, wallFace, wall.dark);
    if (vol.wall === 'wallStone' || app.wall === 'wallStone' || vol.wall === 'wallBrick' || app.wall === 'wallBrick') {
      paintPixelCourses(ctx, wallFace, Math.max(2, Math.floor(H / 8)), Math.max(2, Math.floor((hi - lo) / 0.8)), {
        line: wall.shade,
        joint: wall.dark,
      });
    }
    // A pale lip along the top and a shaded strip under the eaves give the wall depth.
    fillPolygon(ctx, wallQuad(o, vol, face, lo, hi, H - 2.2, H), lit ? wall.shade : wall.dark);
    // A ground floor of another material, with a beam or sill line where the floors above begin.
    const gwTop = pl + fpx;
    if (app.groundWall && vol.floors > 1) {
      const gw = pal.m[app.groundWall];
      fillPolygon(ctx, wallQuad(o, vol, face, lo, hi, 0, gwTop), lit ? gw.lit : gw.shade);
      strokeLine(ctx, wallPoint(o, vol, face, lo, gwTop), wallPoint(o, vol, face, hi, gwTop), lit ? gw.dark : gw.dark, 0.9);
    }
    if (app.jetty && vol.floors > 1) {
      fillPolygon(ctx, wallQuad(o, vol, face, lo, hi, gwTop - 0.4, gwTop + 1.8), lit ? timber.lit : timber.shade);
      fillPolygon(ctx, wallQuad(o, vol, face, lo, hi, gwTop - 1.4, gwTop - 0.4), lit ? timber.dark : timber.dark);
    }
    if (app.quoins) {
      // Dressed corner stones, alternately long and short.
      for (let z = pl, i = 0; z < H - 2.2; z += 4, i++) {
        const w = i % 2 === 0 ? 0.13 : 0.08;
        const top = Math.min(z + 4, H - 2.2);
        fillPolygon(ctx, wallQuad(o, vol, face, lo, lo + w, z, top), lit ? stone.light : stone.lit);
        fillPolygon(ctx, wallQuad(o, vol, face, hi - w, hi, z, top), lit ? stone.light : stone.lit);
      }
    }
    if (pl > 0) fillPolygon(ctx, wallQuad(o, vol, face, lo, hi, 0, pl), lit ? stone.lit : stone.shade);

    const doorOnFace = doorHere && door && door.face === face ? door : null;
    const centres = windowCentres(lo, hi, app.windowSpacing);

    // Half-timbering: a rail at each floor and a post between windows.
    if (app.timber) {
      const line = lit ? timber.lit : timber.shade;
      for (let f = 1; f < vol.floors; f++) {
        strokeLine(ctx, wallPoint(o, vol, face, lo, pl + f * fpx), wallPoint(o, vol, face, hi, pl + f * fpx), line, 1.2);
      }
      const edges = [lo, ...centres.slice(0, -1).map((c, i) => (c + centres[i + 1]!) / 2), hi];
      const postFrom = app.groundWall && vol.floors > 1 ? gwTop : pl;
      for (const u of edges) {
        strokeLine(ctx, wallPoint(o, vol, face, u, postFrom), wallPoint(o, vol, face, u, H - 2.2), line, 1.2);
      }
    }

    // Windows, one row per floor, skipping the one beside the door on the ground floor.
    if (app.windowHeight > 0) {
      for (let f = 0; f < vol.floors; f++) {
        const z0 = pl + f * fpx + fpx * (0.5 - app.windowHeight / 2) + 0.6;
        const z1 = z0 + fpx * app.windowHeight;
        for (const u of centres) {
          if (doorOnFace && f === 0 && Math.abs(u - doorOnFace.u) < DOOR_HALF + WIN_HALF + 0.1) continue;
          if (app.door === 'gate' && f === 0) continue;
          const g = app.shutters;
          if (g) {
            const sh = pal.m[g];
            for (const s of [-1, 1]) {
              const a = u + s * (WIN_HALF + 0.005);
              const b = u + s * (WIN_HALF + 0.075);
              fillPolygon(ctx, wallQuad(o, vol, face, Math.min(a, b), Math.max(a, b), z0, z1), lit ? sh.lit : sh.shade);
            }
          }
          fillPolygon(ctx, wallQuad(o, vol, face, u - WIN_HALF, u + WIN_HALF, z0, z1), lit ? timber.lit : timber.shade);
          fillPolygon(ctx, wallQuad(o, vol, face, u - WIN_HALF + 0.03, u + WIN_HALF - 0.03, z0 + 0.7, z1 - 0.7), lit ? glass.lit : glass.shade);
          // a thin sill
          fillPolygon(ctx, wallQuad(o, vol, face, u - WIN_HALF - 0.025, u + WIN_HALF + 0.025, z0 - 0.7, z0), lit ? wall.light : wall.lit);
        }
      }
    }

    // The door.
    if (doorOnFace) paintDoor(ctx, o, vol, face, doorOnFace.u, app, pal, pl);

    // A balcony over the door: a slab on the face with a rail and balusters.
    if (app.balcony && doorOnFace && lit && vol.floors > 1) {
      const u = doorOnFace.u;
      const z = pl + fpx;
      const slab = [at(o, u - 0.62, vol.y1, z - 1.6), at(o, u + 0.62, vol.y1, z - 1.6), at(o, u + 0.62, vol.y1 + 0.22, z - 1.6), at(o, u - 0.62, vol.y1 + 0.22, z - 1.6)];
      fillPolygon(ctx, [at(o, u - 0.62, vol.y1 + 0.22, z - 1.6), at(o, u + 0.62, vol.y1 + 0.22, z - 1.6), at(o, u + 0.62, vol.y1 + 0.22, z), at(o, u - 0.62, vol.y1 + 0.22, z)], stone.lit);
      fillPolygon(ctx, slab, stone.light);
      const rail = pal.m.iron;
      strokeLine(ctx, at(o, u - 0.62, vol.y1 + 0.2, z + 4), at(o, u + 0.62, vol.y1 + 0.2, z + 4), rail.lit, 0.9);
      for (let k = 0; k <= 6; k++) strokeLine(ctx, at(o, u - 0.62 + (1.24 * k) / 6, vol.y1 + 0.2, z), at(o, u - 0.62 + (1.24 * k) / 6, vol.y1 + 0.2, z + 4), rail.dark, 0.6);
    }
  }
}

function paintDoor(
  ctx: CanvasRenderingContext2D,
  o: Origin,
  vol: Volume,
  face: Face,
  u: number,
  app: Appearance,
  pal: BuildingPalette,
  _pl: number,
): void {
  const lit = face === 'south';
  const wood = pal.m.doorWood;
  const trim = pal.m.wallStone;
  const half = app.door === 'wide' ? 0.42 : app.door === 'gate' ? 0.34 : app.door === 'double' ? 0.26 : DOOR_HALF;
  const h = app.door === 'wide' ? 10.5 : app.door === 'gate' ? 15 : DOOR_PX;
  const base = 0;
  // frame, then the leaf
  fillPolygon(ctx, wallQuad(o, vol, face, u - half - 0.035, u + half + 0.035, base, h + 1), lit ? trim.light : trim.lit);
  const leaf = app.door === 'gate' ? pal.m.iron : wood;
  fillPolygon(ctx, wallQuad(o, vol, face, u - half, u + half, base, h), lit ? leaf.lit : leaf.shade);
  if (app.door === 'double' || app.door === 'wide') {
    strokeLine(ctx, wallPoint(o, vol, face, u, base), wallPoint(o, vol, face, u, h), lit ? wood.dark : wood.dark, 0.9);
  }
  if (app.door === 'arched' || app.door === 'gate') {
    // a pale keystone and an arched head: a lighter wedge across the top
    fillPolygon(ctx, wallQuad(o, vol, face, u - half, u + half, h - 1.4, h), lit ? trim.light : trim.lit);
  }
  // a knob
  if (app.door !== 'gate' && app.door !== 'wide') {
    const k = wallPoint(o, vol, face, u + half * 0.55, DOOR_PX * 0.45);
    ctx.fillStyle = pal.m.gold.lit;
    ctx.fillRect(k.sx - 0.5, k.sy - 0.5, 1, 1);
  }
}

// Roof planes and ridge lines. Returns nothing: heights come from roofHeightAt.
function paintRoof(ctx: CanvasRenderingContext2D, o: Origin, vol: Volume, app: Appearance, pal: BuildingPalette): void {
  const roofTone = pal.m[vol.roof ?? app.roof];
  const wallTone = pal.m[vol.wall ?? app.wall];
  const H = wallHeight(app, vol);
  const w = vol.x1 - vol.x0;
  const d = vol.y1 - vol.y0;
  const ov = OVERHANG;
  const R = roofRise(vol);
  const course = mix(roofTone.lit, pal.outline, 0.14);
  const courseShade = mix(roofTone.shade, pal.outline, 0.16);
  const P = (mx: number, my: number, z: number) => at(o, mx, my, z);

  if (vol.roofShape === 'flat') {
    const rim = 3;
    box(ctx, o, vol.x0, vol.y0, vol.x1, vol.y1, H, H + rim, wallTone, roofTone.lit);
    // the roof floor, inset from the parapet
    const i = 0.1;
    fillPolygon(ctx, [P(vol.x0 + i, vol.y0 + i, H + rim), P(vol.x1 - i, vol.y0 + i, H + rim), P(vol.x1 - i, vol.y1 - i, H + rim), P(vol.x0 + i, vol.y1 - i, H + rim)], roofTone.lit);
    return;
  }

  const eaveZ = H - 0.5;
  const cx = vol.x0 + w / 2;
  const cy = vol.y0 + d / 2;

  if (vol.roofShape === 'gable') {
    if (ridgeAlongX(vol)) {
      // A gable end on the east wall (a triangle of wall), then the lit south plane.
      fillPolygon(ctx, [P(vol.x1, vol.y1, H), P(vol.x1, vol.y0, H), P(vol.x1, cy, H + R * (d / 2) / (d / 2 + ov))], wallTone.shade);
      const sw = P(vol.x0 - ov, vol.y1 + ov, eaveZ);
      const se = P(vol.x1 + ov, vol.y1 + ov, eaveZ);
      const re = P(vol.x1 + ov, cy, H + R);
      const rw = P(vol.x0 - ov, cy, H + R);
      fillPolygon(ctx, [sw, se, re, rw], roofTone.lit);
      paintPixelCourses(ctx, [sw, se, re, rw], 4, Math.max(3, Math.round(w)), {
        line: course,
        joint: courseShade,
      });
      strokePixelPolygon(ctx, [sw, se, re, rw], roofTone.dark);
      strokeLine(ctx, rw, re, roofTone.light, 1.3);
      strokeLine(ctx, sw, se, roofTone.dark, 1.1);
      strokeLine(ctx, se, re, roofTone.dark, 0.9);
    } else {
      fillPolygon(ctx, [P(vol.x0, vol.y1, H), P(vol.x1, vol.y1, H), P(cx, vol.y1, H + R * (w / 2) / (w / 2 + ov))], wallTone.lit);
      const se = P(vol.x1 + ov, vol.y1 + ov, eaveZ);
      const ne = P(vol.x1 + ov, vol.y0 - ov, eaveZ);
      const rn = P(cx, vol.y0 - ov, H + R);
      const rs = P(cx, vol.y1 + ov, H + R);
      fillPolygon(ctx, [se, ne, rn, rs], roofTone.shade);
      paintPixelCourses(ctx, [se, ne, rn, rs], 4, Math.max(3, Math.round(d)), {
        line: courseShade,
        joint: course,
      });
      strokePixelPolygon(ctx, [se, ne, rn, rs], roofTone.dark);
      strokeLine(ctx, rs, rn, roofTone.lit, 1.3);
      strokeLine(ctx, se, ne, roofTone.dark, 1.1);
      strokeLine(ctx, se, rs, roofTone.dark, 0.9);
    }
    return;
  }

  // Hip roof.
  const half = Math.min(w, d) / 2;
  const alongX = w >= d;
  const ridgeA = alongX ? P(vol.x0 + half, cy, H + R) : P(cx, vol.y0 + half, H + R);
  const ridgeB = alongX ? P(vol.x1 - half, cy, H + R) : P(cx, vol.y1 - half, H + R);
  const sw = P(vol.x0 - ov, vol.y1 + ov, eaveZ);
  const se = P(vol.x1 + ov, vol.y1 + ov, eaveZ);
  const ne = P(vol.x1 + ov, vol.y0 - ov, eaveZ);
  const southPlane = alongX ? [sw, se, ridgeB, ridgeA] : [sw, se, ridgeB];
  const eastPlane = alongX ? [se, ne, ridgeB] : [se, ne, ridgeA, ridgeB];
  fillPolygon(ctx, southPlane, roofTone.lit);
  fillPolygon(ctx, eastPlane, roofTone.shade);
  strokePixelPolygon(ctx, southPlane, roofTone.dark);
  strokePixelPolygon(ctx, eastPlane, roofTone.dark);
  if (alongX) {
    paintPixelCourses(ctx, [sw, se, ridgeB, ridgeA], 4, Math.max(3, Math.round(w)), {
      line: course,
      joint: courseShade,
    });
  }
  strokeLine(ctx, sw, se, roofTone.dark, 1.1);
  strokeLine(ctx, se, ne, roofTone.dark, 1.1);
  strokeLine(ctx, se, ridgeB, roofTone.light, 1); // the hip between the lit and shaded planes
  if (ridgeA.sx !== ridgeB.sx || ridgeA.sy !== ridgeB.sy) strokeLine(ctx, ridgeA, ridgeB, roofTone.light, 1.3);
}

// A thin wisp of smoke: three pale puffs drifting up and to the right, fading as they
// rise. Only some chimneys smoke, so the town does not look like a row of kettles.
function paintSmoke(ctx: CanvasRenderingContext2D, from: ScreenPoint, r: number, pal: BuildingPalette): void {
  if (r > 0.6) return;
  ctx.save();
  [[2, -4, 1.9, 0.5], [4.5, -9, 2.4, 0.36], [8, -14, 2.9, 0.24]].forEach(([dx, dy, rad, a]) => {
    ctx.globalAlpha = a!;
    ctx.beginPath();
    ctx.arc(from.sx + dx!, from.sy + dy!, rad!, 0, Math.PI * 2);
    ctx.fillStyle = pal.white;
    ctx.fill();
  });
  ctx.restore();
}

function paintChimneys(ctx: CanvasRenderingContext2D, o: Origin, vol: Volume, app: Appearance, pal: BuildingPalette, count: number, seed: number): void {
  if (vol.roofShape === 'flat') return;
  const brick = pal.m.wallBrick;
  const w = vol.x1 - vol.x0;
  const d = vol.y1 - vol.y0;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.28 + (seed % 5) * 0.06 : 0.22 + i * 0.5;
    const alongX = ridgeAlongX(vol);
    const mx = alongX ? vol.x0 + w * t : vol.x0 + w / 2 - 0.1;
    const my = alongX ? vol.y0 + d / 2 - 0.1 : vol.y0 + d * t;
    const base = roofHeightAt(app, vol, mx + 0.1, my + 0.1) - 1.5;
    box(ctx, o, mx, my, mx + 0.2, my + 0.2, base, base + 8, brick, pal.m.iron.lit);
    paintSmoke(ctx, at(o, mx + 0.1, my + 0.1, base + 9), hash2(seed, i, 7), pal);
    fillPolygon(ctx, [at(o, mx - 0.02, my + 0.22, base + 8), at(o, mx + 0.22, my + 0.22, base + 8), at(o, mx + 0.22, my + 0.22, base + 9.2), at(o, mx - 0.02, my + 0.22, base + 9.2)], brick.dark);
  }
}

function paintAwning(ctx: CanvasRenderingContext2D, o: Origin, vol: Volume, app: Appearance, pal: BuildingPalette, door: DoorPlacement): void {
  if (!app.awning) return;
  const tone = pal.m[app.awning];
  const face = door.face;
  const lo = Math.max(face === 'south' ? vol.x0 : vol.y0, door.u - 0.9);
  const hi = Math.min(face === 'south' ? vol.x1 : vol.y1, door.u + 0.9);
  const zTop = 11;
  const out = 0.3;
  const stripes = Math.max(2, Math.round((hi - lo) / 0.17));
  for (let i = 0; i < stripes; i++) {
    const u0 = lo + ((hi - lo) * i) / stripes;
    const u1 = lo + ((hi - lo) * (i + 1)) / stripes;
    const colour = i % 2 === 0 ? (face === 'south' ? tone.lit : tone.shade) : face === 'south' ? pal.white : mix(pal.white, pal.outline, 0.28);
    const p = (u: number, o2: number, z: number): ScreenPoint =>
      face === 'south' ? at(o, u, vol.y1 + o2, z) : at(o, vol.x1 + o2, u, z);
    fillPolygon(ctx, [p(u0, 0, zTop), p(u1, 0, zTop), p(u1, out, zTop - 4.5), p(u0, out, zTop - 4.5)], colour);
  }
  const p = (u: number, o2: number, z: number): ScreenPoint =>
    face === 'south' ? at(o, u, vol.y1 + o2, z) : at(o, vol.x1 + o2, u, z);
  strokeLine(ctx, p(lo, out, zTop - 4.5), p(hi, out, zTop - 4.5), tone.dark, 1.1);
}

function paintExtra(ctx: CanvasRenderingContext2D, o: Origin, b: Building, app: Appearance, pal: BuildingPalette, extra: Extra, door: DoorPlacement | null): void {
  const main = app.volumes[0]!;
  switch (extra.type) {
    case 'clock': {
      const vol = app.volumes[extra.volume]!;
      const zc = wallHeight(app, vol) - 7;
      for (const face of ['south', 'east'] as const) {
        const u = face === 'south' ? (vol.x0 + vol.x1) / 2 : (vol.y0 + vol.y1) / 2;
        fillPolygon(ctx, wallDisc(o, vol, face, u, zc, 4.6), pal.m.gold.lit);
        fillPolygon(ctx, wallDisc(o, vol, face, u, zc, 3.7), face === 'south' ? pal.white : mix(pal.white, pal.outline, 0.22));
        strokeLine(ctx, wallPoint(o, vol, face, u, zc), wallPoint(o, vol, face, u, zc + 2.8), pal.outline, 0.9);
        strokeLine(ctx, wallPoint(o, vol, face, u, zc), wallPoint(o, vol, face, u + 1.8 / 16, zc), pal.outline, 0.9);
      }
      break;
    }
    case 'dome': {
      const cxm = main.x0 + (main.x1 - main.x0) * 0.62;
      const cym = main.y0 + (main.y1 - main.y0) * 0.5;
      const z = roofHeightAt(app, main, cxm, cym) - 1;
      const c = at(o, cxm, cym, z);
      const teal = pal.m.roofTeal;
      ctx.beginPath();
      ctx.ellipse(c.sx, c.sy, 8, 4, 0, 0, Math.PI * 2);
      ctx.fillStyle = pal.m.wallStone.lit;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c.sx, c.sy - 4, 7, 6.5, 0, Math.PI, 0);
      ctx.lineTo(c.sx + 7, c.sy - 1);
      ctx.ellipse(c.sx, c.sy - 1, 7, 3.2, 0, 0, Math.PI);
      ctx.closePath();
      ctx.fillStyle = teal.lit;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c.sx + 3, c.sy - 5, 3.6, 5.4, 0, -Math.PI / 2, Math.PI / 2);
      ctx.lineTo(c.sx + 3, c.sy - 10.4);
      ctx.closePath();
      ctx.fillStyle = teal.shade;
      ctx.fill();
      strokeLine(ctx, { sx: c.sx, sy: c.sy - 10.5 }, { sx: c.sx, sy: c.sy - 14 }, pal.m.gold.lit, 1);
      break;
    }
    case 'solar': {
      const z = wallHeight(app, main) + 3;
      const panel = pal.m.roofBlue;
      for (let i = 0; i < 3; i++) {
        const x0 = main.x0 + 0.5 + i * 0.65;
        fillPolygon(ctx, [at(o, x0, main.y0 + 0.6, z + 0.2), at(o, x0 + 0.5, main.y0 + 0.6, z + 0.2), at(o, x0 + 0.5, main.y0 + 1.5, z + 2), at(o, x0, main.y0 + 1.5, z + 2)], panel.shade);
        strokeLine(ctx, at(o, x0, main.y0 + 1.05, z + 1.1), at(o, x0 + 0.5, main.y0 + 1.05, z + 1.1), panel.light, 0.6);
      }
      break;
    }
    case 'mast': {
      const z = wallHeight(app, main) + 3;
      const base = at(o, main.x1 - 0.7, main.y0 + 0.7, z);
      strokeLine(ctx, base, { sx: base.sx, sy: base.sy - 17 }, pal.m.iron.lit, 1.1);
      for (const [dy, half] of [[-9, 4], [-13, 3]] as const) {
        strokeLine(ctx, { sx: base.sx - half, sy: base.sy + dy }, { sx: base.sx + half, sy: base.sy + dy }, pal.m.iron.lit, 0.9);
      }
      ctx.fillStyle = pal.m.awnRed.lit;
      ctx.fillRect(base.sx - 0.6, base.sy - 18.4, 1.4, 1.4);
      const dish = at(o, main.x0 + 1.2, main.y0 + 1.2, z + 1);
      ctx.beginPath();
      ctx.ellipse(dish.sx, dish.sy - 2.5, 3.2, 2.4, 0, 0, Math.PI * 2);
      ctx.fillStyle = pal.m.wallWhite.lit;
      ctx.fill();
      break;
    }
    case 'flag': {
      const vol = main;
      const base = at(o, vol.x0 + (vol.x1 - vol.x0) * 0.5, vol.y0 + (vol.y1 - vol.y0) * 0.5, roofHeightAt(app, vol, (vol.x0 + vol.x1) / 2, (vol.y0 + vol.y1) / 2));
      strokeLine(ctx, base, { sx: base.sx, sy: base.sy - 15 }, pal.m.iron.lit, 1);
      fillPolygon(ctx, [{ sx: base.sx, sy: base.sy - 15 }, { sx: base.sx + 8, sy: base.sy - 13 }, { sx: base.sx, sy: base.sy - 10.5 }], pal.m.awnRed.lit);
      break;
    }
    case 'flowerBoxes': {
      if (!door || door.face !== 'south') break;
      const vol = main;
      for (const u of windowCentres(vol.x0, vol.x1, app.windowSpacing)) {
        if (Math.abs(u - door.u) < DOOR_HALF + WIN_HALF + 0.1) continue;
        const z = (app.plinth ? PLINTH_PX : 0) + app.floorPx * (0.5 - app.windowHeight / 2) + 0.6 - 0.7;
        fillPolygon(ctx, wallQuad(o, vol, 'south', u - WIN_HALF - 0.02, u + WIN_HALF + 0.02, z - 2.2, z), pal.m.doorWood.lit);
        pal.flowers.forEach((f, i) => {
          const p = wallPoint(o, vol, 'south', u - WIN_HALF + i * 0.1, z + 0.4);
          ctx.fillStyle = f;
          ctx.fillRect(p.sx - 0.7, p.sy - 1.3, 1.5, 1.5);
        });
      }
      break;
    }
    case 'sign': {
      if (!door) break;
      const vol = main;
      const u = Math.min((door.face === 'south' ? vol.x1 : vol.y1) - 0.15, door.u + 0.62);
      const a = door.face === 'south' ? at(o, u, vol.y1, 12.5) : at(o, vol.x1, u, 12.5);
      const out = door.face === 'south' ? at(o, u, vol.y1 + 0.3, 12.5) : at(o, vol.x1 + 0.3, u, 12.5);
      strokeLine(ctx, a, out, pal.m.iron.lit, 0.9);
      const board = pal.m[extra.colour];
      // a small board hanging from the bracket
      const p0 = { sx: out.sx - 3, sy: out.sy + 0.5 };
      fillPolygon(ctx, [p0, { sx: p0.sx + 6, sy: p0.sy }, { sx: p0.sx + 6, sy: p0.sy + 5 }, { sx: p0.sx, sy: p0.sy + 5 }], board.lit);
      strokeLine(ctx, p0, { sx: p0.sx + 6, sy: p0.sy }, board.dark, 0.8);
      break;
    }
    case 'barnDoor': {
      // Big double doors with a white frame and a cross brace, on the entrance wall or,
      // when that faces away, on the south wall.
      const f = door?.face ?? 'south';
      const u = door?.u ?? (main.x0 + main.x1) / 2;
      const half = 0.62;
      const h = 13;
      const trim = pal.m.wallWhite;
      const lit = f === 'south';
      fillPolygon(ctx, wallQuad(o, main, f, u - half - 0.05, u + half + 0.05, 0, h + 1), lit ? trim.lit : trim.shade);
      fillPolygon(ctx, wallQuad(o, main, f, u - half, u + half, 0, h), lit ? pal.m.roofBrown.lit : pal.m.roofBrown.shade);
      for (const [a, b2] of [[-1, 1], [1, -1]] as const) {
        strokeLine(ctx, wallPoint(o, main, f, u + a * half, 0), wallPoint(o, main, f, u + b2 * half, h), lit ? trim.lit : trim.shade, 1);
      }
      break;
    }
    case 'wheel': {
      // A water wheel on the east wall: a dark ring, pale paddles and a hub.
      const u = (main.y0 + main.y1) / 2 + 0.2;
      fillPolygon(ctx, wallDisc(o, main, 'east', u, 9, 8.6), pal.m.doorWood.dark);
      fillPolygon(ctx, wallDisc(o, main, 'east', u, 9, 6.6), pal.m.wallStone.shade);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 4;
        strokeLine(ctx, wallPoint(o, main, 'east', u + (Math.cos(a) * 8.6) / 16, 9 + Math.sin(a) * 8.6), wallPoint(o, main, 'east', u - (Math.cos(a) * 8.6) / 16, 9 - Math.sin(a) * 8.6), pal.m.doorWood.lit, 1.1);
      }
      fillPolygon(ctx, wallDisc(o, main, 'east', u, 9, 1.8), pal.m.iron.lit);
      break;
    }
    case 'steps': {
      if (!door) break;
      const stone = pal.m.wallStone;
      if (door.face === 'south') {
        for (let i = 0; i < 2; i++) box(ctx, o, door.u - 0.34 + i * 0.03, main.y1 + 0.02 + (1 - i) * 0.1, door.u + 0.34 - i * 0.03, main.y1 + 0.34 - i * 0.1 + (1 - i) * 0.1, 0, 1.6 + i * 1.6, stone);
      } else {
        for (let i = 0; i < 2; i++) box(ctx, o, main.x1 + 0.02 + (1 - i) * 0.1, door.u - 0.34 + i * 0.03, main.x1 + 0.34 - i * 0.1 + (1 - i) * 0.1, door.u + 0.34 - i * 0.03, 0, 1.6 + i * 1.6, stone);
      }
      break;
    }
  }
  void b;
}

export function paintBuilding(
  ctx: CanvasRenderingContext2D,
  o: Origin,
  b: Building,
  app: Appearance,
  pal: BuildingPalette,
  seed: number,
): void {
  const door = doorPlacement(b);
  // Back to front: a volume nearer the viewer is drawn later and covers the ones behind.
  const order = app.volumes
    .map((v, i) => ({ v, i }))
    .sort((p, q) => p.v.x0 + p.v.x1 + p.v.y0 + p.v.y1 - (q.v.x0 + q.v.x1 + q.v.y0 + q.v.y1));

  // The door belongs to the nearest volume whose wall spans its position.
  const doorVolume = door
    ? order
        .filter(({ v }) => (door.face === 'south' ? door.u >= v.x0 && door.u <= v.x1 : door.u >= v.y0 && door.u <= v.y1))
        .sort((p, q) => (door.face === 'south' ? q.v.y1 - p.v.y1 : q.v.x1 - p.v.x1))[0] ?? null
    : null;

  for (const { v, i } of order) {
    const here = doorVolume?.i === i;
    paintWalls(ctx, o, v, app, pal, door, here);
    if (here && door) paintAwning(ctx, o, v, app, pal, door);
    paintRoof(ctx, o, v, app, pal);
    if (i === 0 || v.roofShape !== 'flat') paintChimneys(ctx, o, v, app, pal, i === 0 ? app.chimneys : 0, seed);
  }
  for (const extra of app.extras) paintExtra(ctx, o, b, app, pal, extra, door);
}
