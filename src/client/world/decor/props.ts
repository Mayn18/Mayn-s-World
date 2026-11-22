// Painters for the small things that make a street or a yard look lived in: lamps,
// benches, wells, boats, haystacks, hives, sheep, crates, nets and scarecrows, plus
// fences, garden beds and crop rows.
//
// Like the buildings they use grid-snapped shapes and upper-left lighting, and are drawn
// when the painter reaches their tile, so anything nearer covers them.
import type { BuildingPalette } from '../buildings/palette';
import { at, type Origin } from '../buildings/geometry';
import {
  fillPixelPolygon as fillPolygon,
  fillPixelRect,
  strokePixelLine as strokeLine,
  strokePixelPolygon,
} from '../render/pixelArt';
import { mix } from '../render/terrainPalette';

function pixelEllipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, colour: string): void {
  const points = Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    return { sx: cx + Math.cos(angle) * rx, sy: cy + Math.sin(angle) * ry };
  });
  fillPolygon(ctx, points, colour);
}

function pixelEllipseOutline(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, colour: string): void {
  const points = Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    return { sx: cx + Math.cos(angle) * rx, sy: cy + Math.sin(angle) * ry };
  });
  strokePixelPolygon(ctx, points, colour);
}

// A small box standing on the ground at (x0..x1, y0..y1) tiles inside the tile at `o`.
function slab(
  ctx: CanvasRenderingContext2D,
  o: Origin,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z0: number,
  z1: number,
  lit: string,
  shade: string,
  top: string,
  ink: string,
): void {
  fillPolygon(ctx, [at(o, x0, y1, z0), at(o, x1, y1, z0), at(o, x1, y1, z1), at(o, x0, y1, z1)], lit);
  fillPolygon(ctx, [at(o, x1, y1, z0), at(o, x1, y0, z0), at(o, x1, y0, z1), at(o, x1, y1, z1)], shade);
  // A 1-2 lp contact band where this volume meets whatever is below it, so
  // crates, wells and benches sit on the ground instead of floating.
  const band = Math.min(1.6, (z1 - z0) * 0.3);
  if (band >= 0.6) {
    fillPolygon(ctx, [at(o, x0, y1, z0), at(o, x1, y1, z0), at(o, x1, y1, z0 + band), at(o, x0, y1, z0 + band)], mix(lit, ink, 0.3));
    fillPolygon(ctx, [at(o, x1, y1, z0), at(o, x1, y0, z0), at(o, x1, y0, z0 + band), at(o, x1, y1, z0 + band)], mix(shade, ink, 0.25));
  }
  fillPolygon(ctx, [at(o, x0, y0, z1), at(o, x1, y0, z1), at(o, x1, y1, z1), at(o, x0, y1, z1)], top);
}

function shadow(ctx: CanvasRenderingContext2D, o: Origin, cx: number, cy: number, r: number, pal: BuildingPalette): void {
  const c = at(o, cx + 0.12, cy + 0.1, 0);
  ctx.save();
  ctx.globalAlpha = pal.shadowOpacity * 0.3;
  pixelEllipse(ctx, c.sx, c.sy, r * 22, r * 11, pal.shadow);
  if (pal.shadowEdgeSteps === 2) {
    ctx.globalAlpha = pal.shadowOpacity * 0.42;
    pixelEllipse(ctx, c.sx + r * 4, c.sy + r * 1, r * 12, r * 5, pal.shadow);
  }
  ctx.restore();
}

function lamp(ctx: CanvasRenderingContext2D, o: Origin, pal: BuildingPalette): void {
  const base = at(o, 0.5, 0.5, 0);
  fillPixelRect(ctx, base.sx - 1, base.sy - 14, 2, 14, pal.m.iron.lit);
  fillPixelRect(ctx, base.sx - 2, base.sy - 2, 4, 2, pal.m.iron.lit);
  fillPixelRect(ctx, base.sx - 2, base.sy - 18, 4, 6, pal.m.gold.dark);
  ctx.fillStyle = pal.flowers[1]!;
  fillPixelRect(ctx, base.sx - 2, base.sy - 16, 4, 4, pal.flowers[1]!);
}

function bench(ctx: CanvasRenderingContext2D, o: Origin, pal: BuildingPalette, alongX: boolean): void {
  const wood = pal.m.doorWood;
  const [a, b, c, d] = alongX ? [0.22, 0.4, 0.78, 0.6] : [0.4, 0.22, 0.6, 0.78];
  slab(ctx, o, a, b, c, d, 2.4, 4, wood.lit, wood.shade, wood.light, pal.outline);
  // legs, then the back rest on the far side
  for (const [x, y] of alongX ? ([[0.28, 0.5], [0.72, 0.5]] as const) : ([[0.5, 0.28], [0.5, 0.72]] as const)) {
    const p = at(o, x, y, 0);
    fillPixelRect(ctx, p.sx - 1, p.sy - 2, 2, 2, wood.dark);
  }
  if (alongX) slab(ctx, o, a, b - 0.04, c, b, 4, 7.2, wood.lit, wood.shade, wood.light, pal.outline);
  else slab(ctx, o, a - 0.04, b, a, d, 4, 7.2, wood.lit, wood.shade, wood.light, pal.outline);
}

function well(ctx: CanvasRenderingContext2D, o: Origin, pal: BuildingPalette): void {
  const stone = pal.m.wallStone;
  shadow(ctx, o, 0.5, 0.5, 0.4, pal);
  slab(ctx, o, 0.24, 0.24, 0.76, 0.76, 0, 5.5, stone.lit, stone.shade, pal.glass.shade, pal.outline);
  const wood = pal.m.doorWood;
  for (const [x, y] of [[0.27, 0.73], [0.73, 0.27]] as const) {
    const p = at(o, x, y, 0);
    fillPixelRect(ctx, p.sx - 1, p.sy - 14, 2, 8, wood.dark);
  }
  const roof = pal.m.roofRed;
  fillPolygon(ctx, [at(o, 0.14, 0.86, 13), at(o, 0.86, 0.86, 13), at(o, 0.5, 0.5, 18)], roof.lit);
  fillPolygon(ctx, [at(o, 0.86, 0.86, 13), at(o, 0.86, 0.14, 13), at(o, 0.5, 0.5, 18)], roof.shade);
}

function crate(ctx: CanvasRenderingContext2D, o: Origin, pal: BuildingPalette): void {
  const wood = pal.m.doorWood;
  slab(ctx, o, 0.3, 0.3, 0.7, 0.7, 0, 4.5, wood.lit, wood.shade, wood.light, pal.outline);
  slab(ctx, o, 0.4, 0.45, 0.62, 0.64, 4.5, 7.5, pal.m.wallSand.lit, pal.m.wallSand.shade, pal.m.wallSand.light, pal.outline);
}

function haystack(ctx: CanvasRenderingContext2D, o: Origin, pal: BuildingPalette): void {
  const hay = pal.m.roofThatch;
  const c = at(o, 0.5, 0.5, 0);
  shadow(ctx, o, 0.5, 0.5, 0.45, pal);
  pixelEllipse(ctx, c.sx, c.sy - 1, 7, 3.4, hay.shade);
  fillPolygon(ctx, [
    { sx: c.sx - 6.5, sy: c.sy - 1 },
    { sx: c.sx - 5.5, sy: c.sy - 7 },
    { sx: c.sx - 3, sy: c.sy - 11 },
    { sx: c.sx, sy: c.sy - 13 },
    { sx: c.sx + 3.5, sy: c.sy - 11 },
    { sx: c.sx + 5.8, sy: c.sy - 7 },
    { sx: c.sx + 6.5, sy: c.sy - 1 },
  ], hay.lit);
  fillPolygon(ctx, [
    { sx: c.sx + 2.5, sy: c.sy - 11.5 },
    { sx: c.sx + 4.5, sy: c.sy - 9 },
    { sx: c.sx + 6.5, sy: c.sy - 1 },
    { sx: c.sx + 1.5, sy: c.sy - 1 },
  ], hay.shade);
}

function hive(ctx: CanvasRenderingContext2D, o: Origin, pal: BuildingPalette): void {
  const w = pal.m.wallWhite;
  slab(ctx, o, 0.32, 0.32, 0.68, 0.68, 2, 6.5, w.lit, w.shade, w.light, pal.outline);
  slab(ctx, o, 0.28, 0.28, 0.72, 0.72, 6.5, 8, pal.m.awnYellow.lit, pal.m.awnYellow.shade, pal.m.awnYellow.light, pal.outline);
  const legs = at(o, 0.5, 0.7, 0);
  fillPixelRect(ctx, legs.sx - 3, legs.sy - 2, 2, 2, pal.m.doorWood.dark);
  fillPixelRect(ctx, legs.sx + 2, legs.sy - 2, 2, 2, pal.m.doorWood.dark);
}

function sheep(ctx: CanvasRenderingContext2D, o: Origin, pal: BuildingPalette, v: number): void {
  const c = at(o, 0.3 + v * 0.4, 0.5, 0);
  fillPixelRect(ctx, c.sx - 2, c.sy - 2, 2, 2, pal.outline);
  fillPixelRect(ctx, c.sx + 1, c.sy - 2, 2, 2, pal.outline);
  pixelEllipse(ctx, c.sx, c.sy - 3, 4, 3, pal.white);
  pixelEllipse(ctx, c.sx + 1, c.sy - 3, 2, 2, mix(pal.white, pal.outline, 0.22));
  fillPixelRect(ctx, c.sx + 3, c.sy - 4, 2, 2, pal.outline);
}

function scarecrow(ctx: CanvasRenderingContext2D, o: Origin, pal: BuildingPalette): void {
  const c = at(o, 0.5, 0.5, 0);
  ctx.strokeStyle = pal.woodDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(c.sx, c.sy);
  ctx.lineTo(c.sx, c.sy - 13);
  ctx.moveTo(c.sx - 5, c.sy - 9);
  ctx.lineTo(c.sx + 5, c.sy - 9);
  ctx.stroke();
  fillPixelRect(ctx, c.sx - 2, c.sy - 10, 4, 4, pal.m.awnRed.lit);
  fillPixelRect(ctx, c.sx - 2, c.sy - 14, 4, 4, pal.m.roofThatch.lit);
  fillPixelRect(ctx, c.sx - 2, c.sy - 14, 6, 2, pal.m.roofBrown.lit);
}

function boat(ctx: CanvasRenderingContext2D, o: Origin, pal: BuildingPalette, v: number): void {
  const hull = pal.m.doorWood;
  const c = at(o, 0.5, 0.5, 0);
  const long = v < 0.5;
  const dx = long ? 9 : 5.5;
  const dy = long ? 4.2 : 2.8;
  fillPolygon(ctx, [{ sx: c.sx - dx, sy: c.sy - 2 }, { sx: c.sx + dx, sy: c.sy - 2 + dy * (long ? 1 : -1) }, { sx: c.sx + dx - 1.5, sy: c.sy + 1.2 + dy * (long ? 1 : -1) }, { sx: c.sx - dx + 1.5, sy: c.sy + 1.2 }], hull.lit);
  fillPolygon(ctx, [{ sx: c.sx - dx, sy: c.sy - 2 }, { sx: c.sx + dx, sy: c.sy - 2 + dy * (long ? 1 : -1) }, { sx: c.sx + dx - 1, sy: c.sy - 1 + dy * (long ? 1 : -1) }, { sx: c.sx - dx + 1, sy: c.sy - 1 }], hull.dark);
  fillPolygon(ctx, [{ sx: c.sx - 2, sy: c.sy - 5 }, { sx: c.sx + 2, sy: c.sy - 3 }, { sx: c.sx, sy: c.sy - 1 }, { sx: c.sx - 4, sy: c.sy - 3 }], v < 0.7 ? pal.m.awnBlue.lit : pal.m.awnRed.lit);
}

function net(ctx: CanvasRenderingContext2D, o: Origin, pal: BuildingPalette): void {
  const a = at(o, 0.15, 0.5, 0);
  const b = at(o, 0.85, 0.5, 0);
  ctx.strokeStyle = pal.woodDark;
  ctx.lineWidth = 1.1;
  for (const p of [a, b]) {
    ctx.beginPath();
    ctx.moveTo(p.sx, p.sy);
    ctx.lineTo(p.sx, p.sy - 11);
    ctx.stroke();
  }
  fillPolygon(ctx, [{ sx: a.sx, sy: a.sy - 10 }, { sx: b.sx, sy: b.sy - 10 }, { sx: b.sx, sy: b.sy - 3 }, { sx: a.sx, sy: a.sy - 3 }], mix(pal.glass.lit, pal.white, 0.25));
  strokeLine(ctx, { sx: a.sx, sy: a.sy - 6.5 }, { sx: b.sx, sy: b.sy - 6.5 }, pal.glass.dark, 0.6);
}

function sign(ctx: CanvasRenderingContext2D, o: Origin, pal: BuildingPalette): void {
  const c = at(o, 0.5, 0.5, 0);
  fillPixelRect(ctx, c.sx - 1, c.sy - 10, 2, 10, pal.woodDark);
  fillPolygon(ctx, [{ sx: c.sx - 4, sy: c.sy - 13 }, { sx: c.sx + 4, sy: c.sy - 11 }, { sx: c.sx + 4, sy: c.sy - 6 }, { sx: c.sx - 4, sy: c.sy - 8 }], pal.m.doorWood.lit);
}

// ---- everyday life: casks, carts, woodpiles, troughs, cattle, training and washing ----

function barrel(ctx: CanvasRenderingContext2D, o: Origin, pal: BuildingPalette): void {
  const wood = pal.m.doorWood;
  const c = at(o, 0.5, 0.5, 0);
  shadow(ctx, o, 0.5, 0.5, 0.2, pal);
  fillPolygon(ctx, [
    { sx: c.sx - 4, sy: c.sy },
    { sx: c.sx - 4, sy: c.sy - 2 },
    { sx: c.sx - 2, sy: c.sy - 2 },
    { sx: c.sx - 2, sy: c.sy - 8 },
    { sx: c.sx + 2, sy: c.sy - 8 },
    { sx: c.sx + 4, sy: c.sy - 6 },
    { sx: c.sx + 4, sy: c.sy },
  ], wood.lit);
  pixelEllipse(ctx, c.sx, c.sy - 8, 4, 2, wood.light);
  for (const y of [2.4, 5.6]) strokeLine(ctx, { sx: c.sx - 3.8, sy: c.sy - y }, { sx: c.sx + 3.8, sy: c.sy - y }, pal.m.iron.lit, 0.8);
}

function cart(ctx: CanvasRenderingContext2D, o: Origin, pal: BuildingPalette, alongX: boolean): void {
  const wood = pal.m.doorWood;
  shadow(ctx, o, 0.5, 0.5, 0.5, pal);
  if (alongX) slab(ctx, o, 0.08, 0.3, 0.92, 0.7, 3, 7, wood.lit, wood.shade, wood.light, pal.outline);
  else slab(ctx, o, 0.3, 0.08, 0.7, 0.92, 3, 7, wood.lit, wood.shade, wood.light, pal.outline);
  // hay load and a wheel on the visible side
  const hay = pal.m.roofThatch;
  if (alongX) slab(ctx, o, 0.15, 0.36, 0.85, 0.64, 7, 10, hay.lit, hay.shade, hay.light, pal.outline);
  else slab(ctx, o, 0.36, 0.15, 0.64, 0.85, 7, 10, hay.lit, hay.shade, hay.light, pal.outline);
  const w = alongX ? at(o, 0.5, 0.72, 3) : at(o, 0.72, 0.5, 3);
  pixelEllipseOutline(ctx, w.sx, w.sy, 4, 4, pal.woodDark);
}

function woodpile(ctx: CanvasRenderingContext2D, o: Origin, pal: BuildingPalette): void {
  const wood = pal.m.doorWood;
  slab(ctx, o, 0.22, 0.3, 0.78, 0.7, 0, 3, wood.lit, wood.shade, wood.light, pal.outline);
  slab(ctx, o, 0.28, 0.34, 0.72, 0.66, 3, 5.6, wood.light, wood.lit, wood.light, pal.outline);
  strokeLine(ctx, at(o, 0.3, 0.7, 1.5), at(o, 0.7, 0.7, 1.5), wood.dark, 0.6);
}

function trough(ctx: CanvasRenderingContext2D, o: Origin, pal: BuildingPalette, alongX: boolean): void {
  const wood = pal.m.doorWood;
  const water = pal.glass.lit;
  if (alongX) slab(ctx, o, 0.15, 0.38, 0.85, 0.62, 0, 4, wood.lit, wood.shade, water, pal.outline);
  else slab(ctx, o, 0.38, 0.15, 0.62, 0.85, 0, 4, wood.lit, wood.shade, water, pal.outline);
}

function cow(ctx: CanvasRenderingContext2D, o: Origin, pal: BuildingPalette, v: number): void {
  const c = at(o, 0.3 + v * 0.4, 0.5, 0);
  const patch = v > 0.5;
  ctx.fillStyle = pal.outline;
  for (const dx of [-4, -2, 2, 4]) fillPixelRect(ctx, c.sx + dx, c.sy - 3, 2, 4, pal.outline);
  pixelEllipse(ctx, c.sx, c.sy - 5, 6, 4, patch ? pal.m.wallBrick.lit : pal.white);
  if (!patch) {
    pixelEllipse(ctx, c.sx - 2, c.sy - 6, 2, 2, pal.outline);
  }
  fillPixelRect(ctx, c.sx + 4, c.sy - 8, 2, 2, patch ? pal.m.wallBrick.shade : mix(pal.white, pal.outline, 0.3));
}

// A padded post and a crossbar: where the garrison practises.
function dummy(ctx: CanvasRenderingContext2D, o: Origin, pal: BuildingPalette): void {
  const c = at(o, 0.5, 0.5, 0);
  ctx.strokeStyle = pal.woodDark;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(c.sx, c.sy);
  ctx.lineTo(c.sx, c.sy - 13);
  ctx.moveTo(c.sx - 4.5, c.sy - 9.5);
  ctx.lineTo(c.sx + 4.5, c.sy - 9.5);
  ctx.stroke();
  pixelEllipse(ctx, c.sx, c.sy - 6, 2, 4, pal.m.roofThatch.lit);
  pixelEllipse(ctx, c.sx, c.sy - 14, 2, 2, pal.m.roofThatch.shade);
}

// Washing on a line between two posts.
function laundry(ctx: CanvasRenderingContext2D, o: Origin, pal: BuildingPalette, alongX: boolean): void {
  const a = alongX ? at(o, 0.05, 0.5, 0) : at(o, 0.5, 0.05, 0);
  const b = alongX ? at(o, 0.95, 0.5, 0) : at(o, 0.5, 0.95, 0);
  ctx.strokeStyle = pal.woodDark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(a.sx, a.sy);
  ctx.lineTo(a.sx, a.sy - 11);
  ctx.moveTo(b.sx, b.sy);
  ctx.lineTo(b.sx, b.sy - 11);
  ctx.moveTo(a.sx, a.sy - 10.5);
  ctx.lineTo(b.sx, b.sy - 10.5);
  ctx.stroke();
  const cloths = [pal.white, pal.m.awnBlue.lit, pal.m.awnRed.lit];
  cloths.forEach((col, i) => {
    const t = 0.25 + i * 0.25;
    const x = a.sx + (b.sx - a.sx) * t;
    const y = a.sy + (b.sy - a.sy) * t - 10.5;
    fillPolygon(ctx, [{ sx: x - 1.7, sy: y }, { sx: x + 1.7, sy: y }, { sx: x + 1.7, sy: y + 5 }, { sx: x - 1.7, sy: y + 5 }], col);
  });
}

export const PROP_KINDS = ['lamp', 'bench', 'well', 'crate', 'haystack', 'hive', 'sheep', 'scarecrow', 'boat', 'net', 'sign', 'barrel', 'cart', 'woodpile', 'trough', 'cow', 'dummy', 'laundry'] as const;

export function paintProp(ctx: CanvasRenderingContext2D, o: Origin, kind: string, pal: BuildingPalette, v: number, alongX: boolean): void {
  switch (kind) {
    case 'lamp': return lamp(ctx, o, pal);
    case 'bench': return bench(ctx, o, pal, alongX);
    case 'well': return well(ctx, o, pal);
    case 'crate': return crate(ctx, o, pal);
    case 'haystack': return haystack(ctx, o, pal);
    case 'hive': return hive(ctx, o, pal);
    case 'sheep': return sheep(ctx, o, pal, v);
    case 'scarecrow': return scarecrow(ctx, o, pal);
    case 'boat': return boat(ctx, o, pal, v);
    case 'net': return net(ctx, o, pal);
    case 'sign': return sign(ctx, o, pal);
    case 'barrel': return barrel(ctx, o, pal);
    case 'cart': return cart(ctx, o, pal, alongX);
    case 'woodpile': return woodpile(ctx, o, pal);
    case 'trough': return trough(ctx, o, pal, alongX);
    case 'cow': return cow(ctx, o, pal, v);
    case 'dummy': return dummy(ctx, o, pal);
    case 'laundry': return laundry(ctx, o, pal, alongX);
    default: return undefined;
  }
}

// A villager: two or three colour blocks, readable at a glance and clearly not a sprite
// sheet. Shirt colour varies by `v`.
export function paintVillager(ctx: CanvasRenderingContext2D, o: Origin, ox: number, oy: number, v: number, pal: BuildingPalette): void {
  const c = at(o, ox, oy, 0);
  const shirts = [pal.m.awnRed, pal.m.awnBlue, pal.m.awnGreen, pal.m.awnYellow, pal.m.roofOrange];
  const shirt = shirts[Math.floor(v * shirts.length) % shirts.length]!;
  ctx.save();
  ctx.globalAlpha = 0.16;
  pixelEllipse(ctx, c.sx + 2, c.sy, 2, 2, pal.shadow);
  ctx.restore();
  fillPixelRect(ctx, c.sx - 2, c.sy - 2, 2, 2, pal.m.roofDark.lit);
  fillPixelRect(ctx, c.sx, c.sy - 2, 2, 2, pal.m.roofDark.lit);
  fillPixelRect(ctx, c.sx - 2, c.sy - 6, 4, 4, shirt.lit);
  fillPixelRect(ctx, c.sx - 2, c.sy - 8, 4, 2, pal.m.wallSand.lit);
  fillPixelRect(ctx, c.sx - 2, c.sy - 10, 4, 2, v < 0.5 ? pal.m.roofBrown.dark : pal.m.roofThatch.dark);
}

// ---- fences, beds and crops ---------------------------------------------------

export interface FenceSeg {
  // 'x' runs east-west along the tile's north (at 0) or south (at 1) edge; 'y' runs
  // north-south along its west (at 0) or east (at 1) edge.
  axis: 'x' | 'y';
  at: 0 | 1;
}

export function paintFence(ctx: CanvasRenderingContext2D, o: Origin, seg: FenceSeg, pal: BuildingPalette): void {
  const wood = pal.m.doorWood;
  const P = (u: number, z: number) => (seg.axis === 'x' ? at(o, u, seg.at, z) : at(o, seg.at, u, z));
  const rail = (z: number) => strokeLine(ctx, P(0, z), P(1, z), wood.lit, 1);
  rail(2.6);
  rail(5.2);
  for (const u of [0.08, 0.5, 0.92]) {
    const b = P(u, 0);
    fillPixelRect(ctx, b.sx - 1, b.sy - 6, 2, 6, wood.dark);
    fillPixelRect(ctx, b.sx - 1, b.sy - 6, 2, 2, wood.light);
  }
}

// A garden bed filling a whole tile: dark soil with a few flower or vegetable marks.
export function paintBed(ctx: CanvasRenderingContext2D, o: Origin, pal: BuildingPalette, v: number): void {
  const soil = mix(pal.woodDark, pal.leafDark, 0.25);
  const m = 0.14;
  const quad = [at(o, m, m, 0), at(o, 1 - m, m, 0), at(o, 1 - m, 1 - m, 0), at(o, m, 1 - m, 0)];
  fillPolygon(ctx, quad, soil);
  const flowerSet = v < 0.5 ? [pal.flowers[0]!, pal.flowers[2]!] : [pal.flowers[1]!, pal.leafLight];
  for (let i = 0; i < 6; i++) {
    const x = 0.28 + (i % 3) * 0.22;
    const y = 0.3 + Math.floor(i / 3) * 0.34;
    const p = at(o, x, y, 0);
    fillPixelRect(ctx, p.sx - 1, p.sy - 2, 2, 2, flowerSet[i % 2]!);
  }
}

// Crop rows: thin lines along the tile in a muted tone. Tone and spacing come from the
// field type; there is no random speckle.
export function paintCropRows(ctx: CanvasRenderingContext2D, o: Origin, base: string, line: string, rows: number): void {
  fillPolygon(ctx, [at(o, 0, 0, 0), at(o, 1, 0, 0), at(o, 1, 1, 0), at(o, 0, 1, 0)], base);
  for (let i = 0; i < rows; i++) {
    const u = (i + 0.5) / rows;
    strokeLine(ctx, at(o, 0.02, u, 0), at(o, 0.98, u, 0), line, 0.9);
  }
}
