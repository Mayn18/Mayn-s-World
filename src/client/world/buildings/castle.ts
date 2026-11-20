// The castle's own pieces: towers, the keep, gatehouses and the curtain wall.
//
// These are not houses with a different colour: they are massive stone work, battlemented
// and much taller, so they get their own small painters. They use the same flat style and
// lighting as every other building (lit south faces, shaded east faces) and the same
// local frame (`at`), so they sit on the terrain exactly like a house does.
//
// DETAIL COMES FROM GEOMETRY, NOT TEXTURE (ADR-019). Walls carry a battered foot, a few
// evenly spaced course lines, a belt course and a corbelled parapet; towers carry a flared
// foot, arrow slits and a crown. Nothing here is random per pixel.
import type { Building } from '../data/buildings';
import type { ScreenPoint } from '../render/projection';
import { fillPolygon, strokeLine } from '../render/shapes';
import { mix } from '../render/terrainPalette';
import { type Origin, at } from './geometry';
import type { BuildingPalette, Tone } from './palette';
import { box, doorPlacement } from './painter';
import { cone, cylinder, ellipseRadii, onCylinder } from './solids';
import type { MaterialName } from '../themes';

export const CASTLE_KINDS: readonly string[] = ['tower', 'keep', 'gate'];

const MERLON_H = 4;
const COURSE_PX = 6;

// ---- shared pieces ----------------------------------------------------------------

// A row of battlements round the edge of a flat top at height z.
function battlements(ctx: CanvasRenderingContext2D, o: Origin, x0: number, y0: number, x1: number, y1: number, z: number, tone: Tone, step = 0.5): void {
  const t = 0.2;
  const along = (a: number, b: number) => {
    const n = Math.max(1, Math.round((b - a) / step));
    return Array.from({ length: n }, (_, i) => a + ((i + 0.25) * (b - a)) / n);
  };
  const w = (b: number, a: number) => ((b - a) / Math.max(1, Math.round((b - a) / step))) * 0.5;
  // Far edges first so nearer merlons overlap them.
  for (const x of along(x0, x1)) box(ctx, o, x, y0, x + w(x1, x0), y0 + t, z, z + MERLON_H, tone);
  for (const y of along(y0, y1)) box(ctx, o, x0, y, x0 + t, y + w(y1, y0), z, z + MERLON_H, tone);
  for (const y of along(y0, y1)) box(ctx, o, x1 - t, y, x1, y + w(y1, y0), z, z + MERLON_H, tone);
  for (const x of along(x0, x1)) box(ctx, o, x, y1 - t, x + w(x1, x0), y1, z, z + MERLON_H, tone);
}

// Ashlar course lines on a box's two visible faces. Even spacing, one thin line in a darker
// tone, so the wall reads as laid stone without any speckle.
function courses(ctx: CanvasRenderingContext2D, o: Origin, x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, tone: Tone): void {
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let z = z0 + COURSE_PX; z < z1 - 1; z += COURSE_PX) {
    strokeLine(ctx, at(o, x0, y1, z), at(o, x1, y1, z), tone.dark, 0.6);
    strokeLine(ctx, at(o, x1, y1, z), at(o, x1, y0, z), tone.dark, 0.6);
  }
  ctx.restore();
}

// A stone block: battered foot, shaft with courses, a belt course and a corbelled top.
function stoneMass(ctx: CanvasRenderingContext2D, o: Origin, x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, pal: BuildingPalette): void {
  const stone = pal.m.wallStone;
  const foot = 0.08;
  box(ctx, o, x0 - foot, y0 - foot, x1 + foot, y1 + foot, z0, z0 + 5, stone, stone.light);
  box(ctx, o, x0, y0, x1, y1, z0 + 5, z1, stone, stone.lit);
  courses(ctx, o, x0, y0, x1, y1, z0 + 5, z1, stone);
}

// A flame on a bracket: a torch beside a gate or door.
function torch(ctx: CanvasRenderingContext2D, p: ScreenPoint, pal: BuildingPalette): void {
  ctx.fillStyle = pal.m.iron.dark;
  ctx.fillRect(p.sx - 0.5, p.sy - 3, 1, 3);
  ctx.fillStyle = pal.flowers[1]!;
  ctx.beginPath();
  ctx.ellipse(p.sx, p.sy - 4.2, 1.3, 1.9, 0, 0, Math.PI * 2);
  ctx.fill();
}

function banner(ctx: CanvasRenderingContext2D, tip: ScreenPoint, height: number, pal: BuildingPalette, colour: MaterialName = 'awnRed'): void {
  strokeLine(ctx, tip, { sx: tip.sx, sy: tip.sy - height }, pal.m.iron.lit, 1);
  const top = tip.sy - height;
  fillPolygon(ctx, [{ sx: tip.sx, sy: top }, { sx: tip.sx + 8, sy: top + 2.5 }, { sx: tip.sx, sy: top + 5.5 }], pal.m[colour].lit);
}

// A four-sided pointed roof over a rectangle.
function pyramid(ctx: CanvasRenderingContext2D, o: Origin, x0: number, y0: number, x1: number, y1: number, z: number, rise: number, tone: Tone): void {
  const apex = at(o, (x0 + x1) / 2, (y0 + y1) / 2, z + rise);
  const sw = at(o, x0, y1, z);
  const se = at(o, x1, y1, z);
  const ne = at(o, x1, y0, z);
  fillPolygon(ctx, [sw, se, apex], tone.lit);
  fillPolygon(ctx, [se, ne, apex], tone.shade);
  strokeLine(ctx, se, apex, tone.dark, 0.8);
}

// A hipped roof over a rectangle: a ridge along the longer side, two sloped ends.
function hipRoof(ctx: CanvasRenderingContext2D, o: Origin, x0: number, y0: number, x1: number, y1: number, z: number, rise: number, tone: Tone): void {
  const w = x1 - x0;
  const d = y1 - y0;
  const half = Math.min(w, d) / 2;
  const alongX = w >= d;
  const ra = alongX ? at(o, x0 + half, (y0 + y1) / 2, z + rise) : at(o, (x0 + x1) / 2, y0 + half, z + rise);
  const rb = alongX ? at(o, x1 - half, (y0 + y1) / 2, z + rise) : at(o, (x0 + x1) / 2, y1 - half, z + rise);
  const sw = at(o, x0, y1, z);
  const se = at(o, x1, y1, z);
  const ne = at(o, x1, y0, z);
  fillPolygon(ctx, alongX ? [sw, se, rb, ra] : [sw, se, rb], tone.lit);
  fillPolygon(ctx, alongX ? [se, ne, rb] : [se, ne, ra, rb], tone.shade);
  strokeLine(ctx, se, rb, tone.dark, 0.8);
  strokeLine(ctx, ra, rb, tone.light, 0.8);
}

// Narrow arrow-slit windows on both visible faces.
function slits(ctx: CanvasRenderingContext2D, o: Origin, x0: number, y0: number, x1: number, y1: number, zs: number[], pal: BuildingPalette): void {
  const g = pal.glass.dark;
  for (const z of zs) {
    for (const u of [x0 + (x1 - x0) * 0.3, x0 + (x1 - x0) * 0.7]) {
      fillPolygon(ctx, [at(o, u - 0.05, y1, z), at(o, u + 0.05, y1, z), at(o, u + 0.05, y1, z + 5.5), at(o, u - 0.05, y1, z + 5.5)], g);
    }
    for (const u of [y0 + (y1 - y0) * 0.3, y0 + (y1 - y0) * 0.7]) {
      fillPolygon(ctx, [at(o, x1, u - 0.05, z), at(o, x1, u + 0.05, z), at(o, x1, u + 0.05, z + 5.5), at(o, x1, u - 0.05, z + 5.5)], g);
    }
  }
}

function archedOpening(ctx: CanvasRenderingContext2D, o: Origin, u: number, y: number, half: number, h: number, colour: string, face: 'south' | 'east' = 'south'): void {
  const P = (a: number, z: number): ScreenPoint => (face === 'south' ? at(o, a, y, z) : at(o, y, a, z));
  const pts: ScreenPoint[] = [P(u - half, 0), P(u - half, h - half * 12)];
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI - (i / 8) * Math.PI;
    pts.push(P(u + half * Math.cos(a), h - half * 12 + half * 12 * Math.sin(a)));
  }
  pts.push(P(u + half, 0));
  fillPolygon(ctx, pts, colour);
}

// The iron grille inside a gate arch: a few vertical bars and rails.
function portcullis(ctx: CanvasRenderingContext2D, o: Origin, face: 'south' | 'east', u: number, y: number, half: number, h: number, pal: BuildingPalette): void {
  const P = (a: number, z: number): ScreenPoint => (face === 'south' ? at(o, a, y, z) : at(o, y, a, z));
  for (let i = -2; i <= 2; i++) strokeLine(ctx, P(u + (half * i) / 2.4, 1), P(u + (half * i) / 2.4, h - 4), pal.m.iron.light, 0.7);
  for (const z of [7, 13, 19]) strokeLine(ctx, P(u - half, z), P(u + half, z), pal.m.iron.light, 0.7);
}

// Horizontal course lines wrapped round a cylinder: the front half of an ellipse at each course.
function cylinderCourses(ctx: CanvasRenderingContext2D, o: Origin, cx: number, cy: number, r: number, z0: number, z1: number, tone: Tone): void {
  const { rx, ry } = ellipseRadii(r);
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = tone.dark;
  ctx.lineWidth = 0.6;
  for (let z = z0 + COURSE_PX; z < z1 - 1; z += COURSE_PX) {
    const c = at(o, cx, cy, z);
    ctx.beginPath();
    ctx.ellipse(c.sx, c.sy, rx, ry, 0, 0, Math.PI, false);
    ctx.stroke();
  }
  ctx.restore();
}

// A corbelled parapet round a tower top: a projecting ring, then merlons set round it.
function crown(ctx: CanvasRenderingContext2D, o: Origin, cx: number, cy: number, r: number, z: number, pal: BuildingPalette): void {
  const stone = pal.m.wallStone;
  cylinder(ctx, o, cx, cy, r + 0.14, z, z + 4, stone);
  const count = Math.max(8, Math.round(r * 16));
  const angles = Array.from({ length: count }, (_, i) => (i / count) * Math.PI * 2 + 0.2);
  // Far merlons first, so the near ones overlap them.
  angles.sort((a, b) => Math.cos(a) + Math.sin(a) - (Math.cos(b) + Math.sin(b)));
  const m = 0.1;
  for (const a of angles) {
    const px = cx + (r + 0.04) * Math.cos(a);
    const py = cy + (r + 0.04) * Math.sin(a);
    box(ctx, o, px - m, py - m, px + m, py + m, z + 4, z + 4 + MERLON_H, stone);
  }
}

// ---- heights ----------------------------------------------------------------------

type TowerStyle = 'cone' | 'crown' | 'square';

interface TowerSpec {
  style: TowerStyle;
  body: number; // height of the shaft
  roof: MaterialName;
  slits: number[];
}

// Corner towers carry coloured cones, as in the reference; the lesser towers are lower and
// crenellated, so the castle's skyline is not one repeated shape.
const TOWER_ROOFS: Record<number, MaterialName> = { 9: 'roofSlate', 10: 'roofRed', 11: 'roofBrown', 12: 'roofRed' };

function towerSpec(b: Building): TowerSpec {
  if (/Barbican/.test(b.name)) return { style: 'crown', body: 46, roof: 'roofSlate', slits: [14, 30] };
  if (/Keep Gate/.test(b.name)) return { style: 'cone', body: 52, roof: 'roofSlate', slits: [16, 34] };
  if (/North/.test(b.name)) return { style: 'crown', body: 84, roof: 'roofSlate', slits: [20, 40, 62] };
  return { style: 'cone', body: 66, roof: TOWER_ROOFS[b.id] ?? 'roofRed', slits: [24, 30, 44] };
}

export function castleHeight(b: Building): number {
  if (b.kind === 'keep') return 150;
  if (b.kind === 'tower') {
    const s = towerSpec(b);
    return s.body + (s.style === 'cone' ? 40 : 14);
  }
  return 52;
}

// ---- towers -----------------------------------------------------------------------

function paintTower(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  const stone = pal.m.wallStone;
  const spec = towerSpec(b);
  const cx = b.w / 2;
  const cy = b.d / 2;
  const r = Math.min(b.w, b.d) / 2 - 0.12;
  // A flared foot, the shaft with its courses, then a corbel ring under the top.
  cylinder(ctx, o, cx, cy, r + 0.12, 0, 6, stone);
  cylinder(ctx, o, cx, cy, r + 0.05, 6, 12, stone);
  cylinder(ctx, o, cx, cy, r, 12, spec.body, stone);
  cylinderCourses(ctx, o, cx, cy, r, 12, spec.body, stone);
  cylinder(ctx, o, cx, cy, r + 0.07, spec.body, spec.body + 4, pal.m.wallStone);
  const zs = spec.slits;
  const degs = [20, 62, 105, 40, 84];
  zs.forEach((z, i) => {
    const p = onCylinder(o, cx, cy, r, degs[i % degs.length]!, z);
    ctx.fillStyle = pal.glass.dark;
    ctx.fillRect(p.sx - 0.7, p.sy - 5.5, 1.4, 5.5);
  });
  if (spec.style === 'crown') {
    crown(ctx, o, cx, cy, r, spec.body + 4, pal);
    banner(ctx, at(o, cx, cy, spec.body + 4), 16, pal);
  } else {
    cone(ctx, o, cx, cy, r + 0.2, spec.body + 4, 34, pal.m[spec.roof]);
    banner(ctx, at(o, cx, cy, spec.body + 36), 9, pal);
  }
}

// ---- keep -------------------------------------------------------------------------

function paintKeep(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  const stone = pal.m.wallStone;
  const slate = pal.m.roofSlate;
  const { w, d } = b;
  const BODY = 74;
  const fb = 1.05; // forebuilding depth

  // The great block, set back from the front so the forebuilding stands proud of it.
  stoneMass(ctx, o, 0.2, 0.2, w - 0.2, d - fb, 0, BODY, pal);
  // Pilaster buttresses up the corners and the middle of the visible faces.
  for (const x of [0.2, w * 0.5 - 0.2, w - 0.9]) box(ctx, o, x - 0.1, d - fb - 0.12, x + 0.5, d - fb, 0, BODY - 4, stone, stone.light);
  for (const y of [0.9, d * 0.35]) box(ctx, o, w - 0.2, y, w - 0.08, y + 0.5, 0, BODY - 4, stone, stone.light);
  // Two rows of tall arched windows, narrow lancets above.
  for (const row of [28, 52]) {
    for (const t of [0.14, 0.3, 0.7, 0.86]) {
      const u = 0.2 + (w - 0.4) * t;
      fillPolygon(ctx, [at(o, u - 0.1, d - fb, row), at(o, u + 0.1, d - fb, row), at(o, u + 0.1, d - fb, row + 9), at(o, u - 0.1, d - fb, row + 9)], pal.glass.lit);
      fillPolygon(ctx, [at(o, u - 0.1, d - fb, row + 9), at(o, u + 0.1, d - fb, row + 9), at(o, u, d - fb, row + 12.5)], pal.glass.lit);
    }
    for (const t of [0.3, 0.7]) {
      const v = 0.2 + (d - fb - 0.4) * t;
      fillPolygon(ctx, [at(o, w - 0.2, v - 0.1, row), at(o, w - 0.2, v + 0.1, row), at(o, w - 0.2, v + 0.1, row + 9), at(o, w - 0.2, v - 0.1, row + 9)], pal.glass.shade);
    }
  }
  // Belt course.
  strokeLine(ctx, at(o, 0.2, d - fb, 40), at(o, w - 0.2, d - fb, 40), stone.light, 1);

  // Forebuilding with the entrance, its own battlements and a flight of steps.
  const fx0 = w / 2 - 1.5;
  const fx1 = w / 2 + 1.5;
  stoneMass(ctx, o, fx0, d - fb, fx1, d, 0, 40, pal);
  const door = doorPlacement(b);
  if (door && door.face === 'south') {
    archedOpening(ctx, o, w / 2, d, 0.55, 24, pal.m.doorWood.dark);
    portcullis(ctx, o, 'south', w / 2, d, 0.55, 24, pal);
    torch(ctx, at(o, w / 2 - 0.95, d, 18), pal);
    torch(ctx, at(o, w / 2 + 0.95, d, 18), pal);
  }
  battlements(ctx, o, fx0, d - fb, fx1, d, 40, stone, 0.45);

  // Machicolated crown: a projecting corbel band under the parapet.
  box(ctx, o, 0.1, 0.1, w - 0.1, d - fb + 0.1, BODY, BODY + 4, stone, stone.light);
  for (let i = 0; i < 14; i++) {
    const u = 0.35 + ((w - 0.7) * i) / 13;
    fillPolygon(ctx, [at(o, u - 0.07, d - fb + 0.1, BODY + 0.6), at(o, u + 0.07, d - fb + 0.1, BODY + 0.6), at(o, u + 0.07, d - fb + 0.1, BODY + 3.4), at(o, u - 0.07, d - fb + 0.1, BODY + 3.4)], stone.dark);
  }
  battlements(ctx, o, 0.1, 0.1, w - 0.1, d - fb + 0.1, BODY + 4, stone);

  // A recessed upper storey and a high slate hip roof: the donjon crowns the whole castle.
  const ux0 = 1.5;
  const ux1 = w - 1.5;
  const uy0 = 1.0;
  const uy1 = d - fb - 0.9;
  box(ctx, o, ux0, uy0, ux1, uy1, BODY + 4, BODY + 20, stone, stone.lit);
  courses(ctx, o, ux0, uy0, ux1, uy1, BODY + 4, BODY + 20, stone);
  for (const t of [0.2, 0.4, 0.6, 0.8]) {
    const u = ux0 + (ux1 - ux0) * t;
    fillPolygon(ctx, [at(o, u - 0.08, uy1, BODY + 8), at(o, u + 0.08, uy1, BODY + 8), at(o, u + 0.08, uy1, BODY + 15), at(o, u - 0.08, uy1, BODY + 15)], pal.glass.dark);
  }
  hipRoof(ctx, o, ux0 - 0.15, uy0 - 0.15, ux1 + 0.15, uy1 + 0.15, BODY + 20, 22, slate);

  // Round corner turrets taller than the parapet, with terracotta cones. Far ones first.
  const corners: [number, number][] = [[0.5, 0.5], [w - 0.5, 0.5], [0.5, d - fb - 0.1], [w - 0.5, d - fb - 0.1]];
  corners
    .sort((p, q) => p[0] + p[1] - (q[0] + q[1]))
    .forEach(([cx, cy]) => {
      cylinder(ctx, o, cx, cy, 0.62, 0, BODY + 18, stone);
      cylinderCourses(ctx, o, cx, cy, 0.62, 0, BODY + 18, stone);
      cylinder(ctx, o, cx, cy, 0.7, BODY + 18, BODY + 22, stone);
      cone(ctx, o, cx, cy, 0.78, BODY + 22, 20, pal.m.roofRed);
    });
  banner(ctx, at(o, w / 2, (d - fb) / 2, BODY + 42), 14, pal);
}

// ---- gatehouses -------------------------------------------------------------------

// The four gates in the town (not the castle's gatehouses) are drawn as the reference
// shows them: pale round towers with dark conical roofs standing either side of a street.
const TOWN_GATES: ReadonlySet<number> = new Set([27, 28, 33, 34]);

function paintGateTower(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  const stone = pal.m.wallStone;
  const cx = b.w / 2;
  const cy = b.d / 2;
  const r = Math.min(b.w, b.d) / 2 - 0.06;
  cylinder(ctx, o, cx, cy, r + 0.05, 0, 5, stone);
  cylinder(ctx, o, cx, cy, r, 5, 30, stone);
  cylinderCourses(ctx, o, cx, cy, r, 5, 30, stone);
  for (const deg of [30, 85]) {
    const p = onCylinder(o, cx, cy, r, deg, 18);
    ctx.fillStyle = pal.glass.dark;
    ctx.fillRect(p.sx - 0.7, p.sy - 5, 1.4, 5);
  }
  cone(ctx, o, cx, cy, r + 0.1, 30, 16, pal.m.roofSlate);
}

function paintGate(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  if (TOWN_GATES.has(b.id)) return paintGateTower(ctx, o, b, pal);
  const stone = pal.m.wallStone;
  const { w, d } = b;
  const H = 46;
  stoneMass(ctx, o, 0, 0, w, d, 0, H, pal);
  // The archway faces the road: south for an east-west gate, east for a north-south one.
  const face = w >= d ? 'south' : 'east';
  const u = w >= d ? w / 2 : d / 2;
  const edge = w >= d ? d : w;
  archedOpening(ctx, o, u, edge, 0.42, 28, pal.m.iron.dark, face);
  portcullis(ctx, o, face, u, edge, 0.42, 28, pal);
  if (face === 'south') {
    torch(ctx, at(o, u - 0.7, d, 20), pal);
    torch(ctx, at(o, u + 0.7, d, 20), pal);
  }
  slits(ctx, o, 0, 0, w, d, [33], pal);
  // Corbelled parapet, battlements, then a low slate roof set inside and a banner.
  box(ctx, o, -0.06, -0.06, w + 0.06, d + 0.06, H, H + 4, stone, stone.light);
  battlements(ctx, o, -0.06, -0.06, w + 0.06, d + 0.06, H + 4, stone, 0.45);
  hipRoof(ctx, o, 0.25, 0.25, w - 0.25, d - 0.25, H + 4, 9, pal.m.roofSlate);
  banner(ctx, at(o, w / 2, d / 2, H + 13), 10, pal);
}

export function paintCastlePiece(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  if (b.kind === 'tower') paintTower(ctx, o, b, pal);
  else if (b.kind === 'keep') paintKeep(ctx, o, b, pal);
  else paintGate(ctx, o, b, pal);
}

// ---- curtain wall -----------------------------------------------------------------

// One tile of curtain wall. `along` is the direction the wall runs. It is thick and tall,
// with a battered foot, courses, a belt course, an arrow slit and a wall walk behind the
// merlons.
export const WALL_HEIGHT = 28;
export function paintWallTile(ctx: CanvasRenderingContext2D, o: Origin, along: 'x' | 'y', pal: BuildingPalette): void {
  const stone = pal.m.wallStone;
  const lo = 0.26;
  const hi = 0.74;
  const x0 = along === 'x' ? 0 : lo;
  const x1 = along === 'x' ? 1 : hi;
  const y0 = along === 'x' ? lo : 0;
  const y1 = along === 'x' ? hi : 1;
  // Battered foot, then the shaft.
  box(ctx, o, x0 - (along === 'y' ? 0.06 : 0), y0 - (along === 'x' ? 0.06 : 0), x1 + (along === 'y' ? 0.06 : 0), y1 + (along === 'x' ? 0.06 : 0), 0, 5, stone, stone.light);
  box(ctx, o, x0, y0, x1, y1, 5, WALL_HEIGHT - 4, stone, stone.lit);
  courses(ctx, o, x0, y0, x1, y1, 5, WALL_HEIGHT - 4, stone);
  // An arrow slit in the middle of the visible face.
  const g = pal.glass.dark;
  if (along === 'x') {
    fillPolygon(ctx, [at(o, 0.47, y1, 13), at(o, 0.53, y1, 13), at(o, 0.53, y1, 21), at(o, 0.47, y1, 21)], g);
  } else {
    fillPolygon(ctx, [at(o, x1, 0.47, 13), at(o, x1, 0.53, 13), at(o, x1, 0.53, 21), at(o, x1, 0.47, 21)], g);
  }
  // Corbelled walkway and parapet.
  box(ctx, o, x0 - (along === 'y' ? 0.05 : 0), y0 - (along === 'x' ? 0.05 : 0), x1 + (along === 'y' ? 0.05 : 0), y1 + (along === 'x' ? 0.05 : 0), WALL_HEIGHT - 4, WALL_HEIGHT, stone, mix(stone.light, pal.white, 0.1));
  battlements(ctx, o, x0, y0, x1, y1, WALL_HEIGHT, stone, 0.5);
}
