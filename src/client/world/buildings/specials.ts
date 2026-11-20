// Buildings that are not boxes with roofs: the windmill, the fountain, market stalls and
// the bandstand. Each has its own small painter, like the castle pieces, and uses the
// same flat two-tone lighting and the same `at` frame, so it sits on the terrain exactly
// like a house does.
import type { Building } from '../data/buildings';
import { fillPolygon, strokeLine } from '../render/shapes';
import { mix } from '../render/terrainPalette';
import type { MaterialName } from '../themes';
import { type Origin, at } from './geometry';
import type { BuildingPalette } from './palette';
import { box } from './painter';
import { cone, cylinder, ellipseRadii } from './solids';

export const SPECIAL_KINDS: readonly string[] = ['windmill', 'fountain', 'stall', 'bandstand'];

export function specialHeight(b: Building): number {
  switch (b.kind) {
    case 'windmill': return 80;
    case 'bandstand': return 38;
    case 'stall': return 24;
    default: return 22;
  }
}

function ellipseAt(ctx: CanvasRenderingContext2D, o: Origin, cx: number, cy: number, z: number, r: number, colour: string): void {
  const c = at(o, cx, cy, z);
  const { rx, ry } = ellipseRadii(r);
  ctx.beginPath();
  ctx.ellipse(c.sx, c.sy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = colour;
  ctx.fill();
}

function paintFountain(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  const cx = b.w / 2;
  const cy = b.d / 2;
  const stone = pal.m.wallStone;
  const water = pal.glass;
  // Wide low basin: rim, then the water set a little lower inside it.
  cylinder(ctx, o, cx, cy, 1.38, 0, 4, stone);
  ellipseAt(ctx, o, cx, cy, 3.2, 1.2, water.lit);
  ellipseAt(ctx, o, cx, cy, 3.2, 0.72, mix(water.lit, pal.white, 0.2));
  // A central pedestal with a smaller upper bowl, and a spout.
  cylinder(ctx, o, cx, cy, 0.22, 3, 11, stone);
  cylinder(ctx, o, cx, cy, 0.55, 9, 11.5, stone);
  ellipseAt(ctx, o, cx, cy, 11.5, 0.42, water.lit);
  const top = at(o, cx, cy, 11.5);
  ctx.strokeStyle = mix(water.light, pal.white, 0.5);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(top.sx, top.sy);
  ctx.lineTo(top.sx, top.sy - 8);
  ctx.moveTo(top.sx - 2.4, top.sy - 1);
  ctx.quadraticCurveTo(top.sx - 3, top.sy - 5, top.sx, top.sy - 6);
  ctx.moveTo(top.sx + 2.4, top.sy - 1);
  ctx.quadraticCurveTo(top.sx + 3, top.sy - 5, top.sx, top.sy - 6);
  ctx.stroke();
}

const STALL_AWNINGS: MaterialName[] = ['awnRed', 'awnYellow', 'awnGreen', 'awnRed'];

function paintStall(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  const tone = pal.m[STALL_AWNINGS[b.id % STALL_AWNINGS.length]!];
  const wood = pal.m.doorWood;
  const { w, d } = b;
  const x0 = 0.12;
  const x1 = w - 0.12;
  const y0 = 0.12;
  const y1 = d - 0.12;
  // posts at the back corners first, then the counter, then the canopy over everything
  for (const [x, y] of [[x0, y0], [x1, y0]] as const) {
    const p = at(o, x, y, 0);
    ctx.fillStyle = wood.dark;
    ctx.fillRect(p.sx - 0.8, p.sy - 16, 1.6, 16);
  }
  box(ctx, o, x0 + 0.05, y0 + 0.35, x1 - 0.05, y1 - 0.05, 0, 5, wood);
  // goods on the counter
  const goods = [pal.m.roofOrange.lit, pal.m.awnGreen.lit, pal.m.awnRed.lit, pal.m.awnYellow.lit];
  for (let i = 0; i < 6; i++) {
    const p = at(o, x0 + 0.3 + (i * (x1 - x0 - 0.6)) / 5, y1 - 0.25, 5);
    ctx.fillStyle = goods[(i + b.id) % goods.length]!;
    ctx.fillRect(p.sx - 1, p.sy - 1.6, 2, 1.6);
  }
  const front = (x: number, z: number) => at(o, x, y1 + 0.2, z);
  const back = (x: number, z: number) => at(o, x, y0, z);
  const n = Math.max(4, Math.round((x1 - x0) / 0.2));
  for (let i = 0; i < n; i++) {
    const a = x0 + ((x1 - x0) * i) / n;
    const c = x0 + ((x1 - x0) * (i + 1)) / n;
    fillPolygon(ctx, [back(a, 17), back(c, 17), front(c, 11), front(a, 11)], i % 2 === 0 ? tone.lit : pal.white);
  }
  const east = at(o, x1, y1 + 0.2, 11);
  fillPolygon(ctx, [back(x1, 17), east, at(o, x1, y1 + 0.2, 10), at(o, x1, y0, 16)], tone.shade);
  strokeLine(ctx, front(x0, 11), front(x1, 11), tone.dark, 1);
}

function paintBandstand(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  const cx = b.w / 2;
  const cy = b.d / 2;
  const stone = pal.m.wallStone;
  cylinder(ctx, o, cx, cy, 0.92, 0, 3.4, stone);
  cylinder(ctx, o, cx, cy, 0.8, 3.4, 4, pal.m.doorWood);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    const p = at(o, cx + 0.72 * Math.cos(a), cy + 0.72 * Math.sin(a), 4);
    ctx.fillStyle = i < 3 ? pal.m.wallWhite.shade : pal.m.wallWhite.lit;
    ctx.fillRect(p.sx - 0.8, p.sy - 17, 1.6, 17);
  }
  cone(ctx, o, cx, cy, 1.0, 21, 15, pal.m.roofRed);
  const tip = at(o, cx, cy, 36);
  strokeLine(ctx, tip, { sx: tip.sx, sy: tip.sy - 5 }, pal.m.gold.lit, 0.9);
}

// A tapering round tower with a cap and four sails on its south-east face.
function paintWindmill(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  const cx = b.w / 2;
  const cy = b.d / 2;
  const wall = pal.m.wallCream;
  cylinder(ctx, o, cx, cy, 1.3, 0, 6, pal.m.wallStone);
  cylinder(ctx, o, cx, cy, 1.15, 6, 38, wall);
  cylinder(ctx, o, cx, cy, 0.95, 38, 48, wall);
  cone(ctx, o, cx, cy, 1.08, 48, 15, pal.m.roofBrown);
  // sails radiate from a hub on the viewer's side of the cap
  const hub = at(o, cx + 0.62, cy + 0.62, 42);
  const sail = pal.m.wallWhite;
  const frame = pal.m.doorWood.dark;
  const L = 27;
  for (const a of [0.45, 0.45 + Math.PI / 2]) {
    for (const s of [1, -1]) {
      const dx = Math.cos(a) * L * s;
      const dy = Math.sin(a) * L * s * 0.9;
      const px = -Math.sin(a) * 3.2;
      const py = Math.cos(a) * 3.2;
      fillPolygon(ctx, [{ sx: hub.sx + dx * 0.3 + px * 0.3, sy: hub.sy + dy * 0.3 + py * 0.3 }, { sx: hub.sx + dx + px, sy: hub.sy + dy + py }, { sx: hub.sx + dx, sy: hub.sy + dy }, { sx: hub.sx + dx * 0.3, sy: hub.sy + dy * 0.3 }], s > 0 ? sail.lit : sail.shade);
    }
    strokeLine(ctx, { sx: hub.sx - Math.cos(a) * L, sy: hub.sy - Math.sin(a) * L * 0.9 }, { sx: hub.sx + Math.cos(a) * L, sy: hub.sy + Math.sin(a) * L * 0.9 }, frame, 1.1);
  }
  ctx.beginPath();
  ctx.arc(hub.sx, hub.sy, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = pal.m.iron.lit;
  ctx.fill();
  // a small door at the foot
  const d = at(o, cx + 0.45, cy + 0.98, 0);
  ctx.fillStyle = pal.m.doorWood.lit;
  ctx.fillRect(d.sx - 1.8, d.sy - 7, 3.6, 7);
}

export function paintSpecial(ctx: CanvasRenderingContext2D, o: Origin, b: Building, pal: BuildingPalette): void {
  switch (b.kind) {
    case 'windmill': return paintWindmill(ctx, o, b, pal);
    case 'fountain': return paintFountain(ctx, o, b, pal);
    case 'stall': return paintStall(ctx, o, b, pal);
    case 'bandstand': return paintBandstand(ctx, o, b, pal);
  }
}
