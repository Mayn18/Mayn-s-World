// The castle's own pieces: towers, the keep, gatehouses and the curtain wall.
//
// These are not houses with a different colour: they are stone, battlemented and
// much taller, so they get their own small painters. They use the same flat style and
// lighting as every other building (lit south faces, shaded east faces) and the same
// local frame (`at`), so they sit on the terrain exactly like a house does.
import type { Building } from '../data/buildings';
import type { ScreenPoint } from '../render/projection';
import { fillPolygon, strokeLine } from '../render/shapes';
import { type Origin, at } from './geometry';
import type { BuildingPalette, Tone } from './palette';
import { box, doorPlacement } from './painter';
import { cone, cylinder, onCylinder } from './solids';
import type { MaterialName } from '../themes';

export const CASTLE_KINDS: readonly string[] = ['tower', 'keep', 'gate'];

const MERLON_H = 3.6;

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

export function castleHeight(b: Building): number {
  if (b.kind === 'tower') return 100;
  if (b.kind === 'keep') return 100;
  return 46;
}

// Cone colours of the four corner towers, as in the reference: slate and terracotta,
// not one repeated colour.
const TOWER_ROOFS: Record<number, MaterialName> = { 9: 'roofSlate', 10: 'roofRed', 11: 'roofBrown', 12: 'roofRed' };

function paintTower(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  const stone = pal.m.wallStone;
  const roof = pal.m[TOWER_ROOFS[b.id] ?? 'roofRed'];
  const cx = b.w / 2;
  const cy = b.d / 2;
  const r = Math.min(b.w, b.d) / 2 - 0.12;
  // A broad foot, the shaft, then a slightly wider crown under the cone.
  cylinder(ctx, o, cx, cy, r + 0.08, 0, 5, stone);
  cylinder(ctx, o, cx, cy, r, 5, 60, stone);
  cylinder(ctx, o, cx, cy, r + 0.06, 60, 65, stone);
  for (const [deg, z] of [[20, 24], [62, 30], [105, 24], [40, 44]] as const) {
    const p = onCylinder(o, cx, cy, r, deg, z);
    ctx.fillStyle = pal.glass.dark;
    ctx.fillRect(p.sx - 0.7, p.sy - 5, 1.4, 5);
  }
  cone(ctx, o, cx, cy, r + 0.2, 65, 36, roof);
  const tip = at(o, cx, cy, 101);
  strokeLine(ctx, tip, { sx: tip.sx, sy: tip.sy - 8 }, pal.m.iron.lit, 0.9);
  fillPolygon(ctx, [{ sx: tip.sx, sy: tip.sy - 8 }, { sx: tip.sx + 6, sy: tip.sy - 6 }, { sx: tip.sx, sy: tip.sy - 4 }], pal.m.awnRed.lit);
}

function paintKeep(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  const stone = pal.m.wallStone;
  const slate = pal.m.roofSlate;
  const { w, d } = b;
  // Base block, with a plinth.
  box(ctx, o, 0.2, 0.2, w - 0.2, d, 0, 60, stone, stone.lit);
  box(ctx, o, 0.15, 0.15, w - 0.15, d + 0.05, 0, 4, pal.m.wallStone);
  // Windows in two rows.
  const wins = [0.2, 0.34, 0.5, 0.66, 0.8];
  for (const row of [24, 44]) {
    for (const t of wins) {
      const u = 0.2 + (w - 0.4) * t;
      if (row === 24 && Math.abs(u - (b.door ? b.door.x + 0.5 - b.x : 4)) < 0.5) continue;
      fillPolygon(ctx, [at(o, u - 0.1, d, row), at(o, u + 0.1, d, row), at(o, u + 0.1, d, row + 8), at(o, u - 0.1, d, row + 8)], pal.glass.lit);
      fillPolygon(ctx, [at(o, u - 0.1, d, row + 8), at(o, u + 0.1, d, row + 8), at(o, u, d, row + 11)], pal.glass.lit);
    }
    for (const t of [0.25, 0.5, 0.75]) {
      const v = (d - 0.2) * t;
      fillPolygon(ctx, [at(o, w - 0.2, v - 0.1, row), at(o, w - 0.2, v + 0.1, row), at(o, w - 0.2, v + 0.1, row + 8), at(o, w - 0.2, v - 0.1, row + 8)], pal.glass.shade);
    }
  }
  // Belt course between the floors.
  strokeLine(ctx, at(o, 0.2, d, 34), at(o, w - 0.2, d, 34), stone.dark, 0.8);
  const door = doorPlacement(b);
  if (door && door.face === 'south') archedOpening(ctx, o, door.u, d, 0.5, 20, pal.m.doorWood.dark);
  battlements(ctx, o, 0.2, 0.2, w - 0.2, d, 60, stone);
  // A dark hipped roof over a recessed upper storey, rising from inside the battlements.
  box(ctx, o, 1.3, 1.1, w - 1.3, d - 1.1, 60, 70, stone, stone.lit);
  for (const t of [0.2, 0.4, 0.6, 0.8]) {
    const u = 1.3 + (w - 2.6) * t;
    fillPolygon(ctx, [at(o, u - 0.08, d - 1.1, 62.5), at(o, u + 0.08, d - 1.1, 62.5), at(o, u + 0.08, d - 1.1, 67.5), at(o, u - 0.08, d - 1.1, 67.5)], pal.glass.dark);
  }
  hipRoof(ctx, o, 1.15, 0.95, w - 1.15, d - 0.95, 70, 17, slate);
  // Corner turrets: round, with terracotta cones.
  const corners: [number, number][] = [[0.55, 0.55], [w - 0.55, 0.55], [0.55, d - 0.55], [w - 0.55, d - 0.55]];
  corners
    .sort((p, q) => p[0] + p[1] - (q[0] + q[1]))
    .forEach(([cx, cy]) => {
      cylinder(ctx, o, cx, cy, 0.55, 0, 66, stone);
      cone(ctx, o, cx, cy, 0.66, 66, 19, pal.m.roofRed);
    });
  // Banner above the entrance.
  const tip = at(o, w / 2, d / 2, 87);
  strokeLine(ctx, tip, { sx: tip.sx, sy: tip.sy - 11 }, pal.m.iron.lit, 1);
  fillPolygon(ctx, [{ sx: tip.sx, sy: tip.sy - 11 }, { sx: tip.sx + 8, sy: tip.sy - 8 }, { sx: tip.sx, sy: tip.sy - 5 }], pal.m.awnRed.lit);
}

// The four gates in the town (not the castle's two gatehouses) are drawn as the reference
// shows them: pale round towers with dark conical roofs standing either side of a street.
const TOWN_GATES: ReadonlySet<number> = new Set([27, 28, 33, 34]);

function paintGateTower(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  const stone = pal.m.wallStone;
  const cx = b.w / 2;
  const cy = b.d / 2;
  const r = Math.min(b.w, b.d) / 2 - 0.06;
  cylinder(ctx, o, cx, cy, r, 0, 30, stone);
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
  box(ctx, o, 0, 0, w, d, 0, 36, stone, stone.lit);
  box(ctx, o, 0, 0, w, d, 0, 3, pal.m.wallStone);
  // The archway faces the road: south for an east-west gate, east for a north-south one.
  const face = w >= d ? 'south' : 'east';
  if (face === 'south') archedOpening(ctx, o, w / 2, d, 0.4, 24, pal.m.iron.dark);
  else archedOpening(ctx, o, d / 2, w, 0.4, 24, pal.m.iron.dark, 'east');
  portcullis(ctx, o, w >= d ? 'south' : 'east', w >= d ? w / 2 : d / 2, w >= d ? d : w, 0.4, 24, pal);
  slits(ctx, o, 0, 0, w, d, [27], pal);
  box(ctx, o, -0.05, -0.05, w + 0.05, d + 0.05, 36, 40, pal.m.wallStone, stone.light);
  battlements(ctx, o, -0.05, -0.05, w + 0.05, d + 0.05, 40, stone, 0.45);
  // A low slate roof set inside the parapet, and a banner on its ridge.
  hipRoof(ctx, o, 0.2, 0.2, w - 0.2, d - 0.2, 40, 9, pal.m.roofSlate);
  const tip = at(o, w / 2, d / 2, 49);
  strokeLine(ctx, tip, { sx: tip.sx, sy: tip.sy - 10 }, pal.m.iron.lit, 0.9);
  fillPolygon(ctx, [{ sx: tip.sx, sy: tip.sy - 10 }, { sx: tip.sx + 6, sy: tip.sy - 8 }, { sx: tip.sx, sy: tip.sy - 6 }], pal.m.awnRed.lit);
}

export function paintCastlePiece(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  if (b.kind === 'tower') paintTower(ctx, o, b, pal);
  else if (b.kind === 'keep') paintKeep(ctx, o, b, pal);
  else paintGate(ctx, o, b, pal);
}

// One tile of curtain wall. `along` is the direction the wall runs.
export const WALL_HEIGHT = 15;
export function paintWallTile(ctx: CanvasRenderingContext2D, o: Origin, along: 'x' | 'y', pal: BuildingPalette): void {
  const stone = pal.m.wallStone;
  const lo = 0.3;
  const hi = 0.7;
  if (along === 'x') {
    box(ctx, o, 0, lo, 1, hi, 0, WALL_HEIGHT, stone, stone.light);
    battlements(ctx, o, 0, lo, 1, hi, WALL_HEIGHT, stone, 0.5);
  } else {
    box(ctx, o, lo, 0, hi, 1, 0, WALL_HEIGHT, stone, stone.light);
    battlements(ctx, o, lo, 0, hi, 1, WALL_HEIGHT, stone, 0.5);
  }
}
