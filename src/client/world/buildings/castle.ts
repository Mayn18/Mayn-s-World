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

export function castleHeight(b: Building): number {
  if (b.kind === 'tower') return 100;
  if (b.kind === 'keep') return 100;
  return 46;
}

function paintTower(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  const stone = pal.m.wallStone;
  const roof = pal.m.roofBlue;
  const { w, d } = b;
  box(ctx, o, 0.2, 0.2, w - 0.2, d - 0.2, 0, 3, pal.m.wallStone);
  box(ctx, o, 0.3, 0.3, w - 0.3, d - 0.3, 0, 58, stone, stone.lit);
  slits(ctx, o, 0.3, 0.3, w - 0.3, d - 0.3, [16, 38], pal);
  // The crown: a wider band at the top, as on a real machicolated tower.
  box(ctx, o, 0.1, 0.1, w - 0.1, d - 0.1, 58, 64, pal.m.wallStone, stone.light);
  strokeLine(ctx, at(o, 0.1, d - 0.1, 58), at(o, w - 0.1, d - 0.1, 58), stone.dark, 0.8);
  pyramid(ctx, o, 0.0, 0.0, w, d, 64, 34, roof);
  // A pennant on the tip.
  const tip = at(o, w / 2, d / 2, 98);
  strokeLine(ctx, tip, { sx: tip.sx, sy: tip.sy - 9 }, pal.m.iron.lit, 0.9);
  fillPolygon(ctx, [{ sx: tip.sx, sy: tip.sy - 9 }, { sx: tip.sx + 6, sy: tip.sy - 7 }, { sx: tip.sx, sy: tip.sy - 5 }], pal.m.awnRed.lit);
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
  // The inner tower and its roof rise above the battlements.
  box(ctx, o, 1.9, 1.3, w - 1.9, d - 1.3, 60, 84, stone, stone.lit);
  for (const t of [0.35, 0.65]) {
    const u = 1.9 + (w - 3.8) * t;
    fillPolygon(ctx, [at(o, u - 0.1, d - 1.3, 68), at(o, u + 0.1, d - 1.3, 68), at(o, u + 0.1, d - 1.3, 76), at(o, u - 0.1, d - 1.3, 76)], pal.glass.lit);
  }
  pyramid(ctx, o, 1.75, 1.15, w - 1.75, d - 1.15, 84, 24, slate);
  // Corner turrets.
  const corners: [number, number][] = [
    [0.0, 0.0],
    [w - 1.2, 0.0],
    [0.0, d - 1.2],
    [w - 1.2, d - 1.2],
  ];
  corners
    .sort((p, q) => p[0] + p[1] - (q[0] + q[1]))
    .forEach(([cx, cy]) => {
      box(ctx, o, cx, cy, cx + 1.2, cy + 1.2, 0, 76, stone, stone.lit);
      pyramid(ctx, o, cx - 0.08, cy - 0.08, cx + 1.28, cy + 1.28, 76, 20, pal.m.roofBlue);
    });
  // Banner above the entrance.
  const tip = at(o, w / 2, d / 2, 108);
  strokeLine(ctx, tip, { sx: tip.sx, sy: tip.sy - 11 }, pal.m.iron.lit, 1);
  fillPolygon(ctx, [{ sx: tip.sx, sy: tip.sy - 11 }, { sx: tip.sx + 8, sy: tip.sy - 8 }, { sx: tip.sx, sy: tip.sy - 5 }], pal.m.awnRed.lit);
}

function paintGate(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  const stone = pal.m.wallStone;
  const { w, d } = b;
  box(ctx, o, 0, 0, w, d, 0, 36, stone, stone.lit);
  box(ctx, o, 0, 0, w, d, 0, 3, pal.m.wallStone);
  // The archway faces the road: south for an east-west gate, east for a north-south one.
  const face = w >= d ? 'south' : 'east';
  if (face === 'south') archedOpening(ctx, o, w / 2, d, 0.4, 24, pal.m.iron.dark);
  else archedOpening(ctx, o, d / 2, w, 0.4, 24, pal.m.iron.dark, 'east');
  slits(ctx, o, 0, 0, w, d, [27], pal);
  box(ctx, o, -0.05, -0.05, w + 0.05, d + 0.05, 36, 40, pal.m.wallStone, stone.light);
  battlements(ctx, o, -0.05, -0.05, w + 0.05, d + 0.05, 40, stone, 0.45);
  const tip = at(o, w / 2, d / 2, 40);
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
