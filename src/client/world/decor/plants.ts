// Painters for trees, bushes and other plants.
//
// Every plant follows the same upper-left light and lower-right shade. Stepped canopy
// clusters, layered colour blocks and varied silhouettes keep the foliage readable.
import type { BuildingPalette } from '../buildings/palette';
import { mix } from '../render/terrainPalette';
import {
  fillPixelPolygon,
  fillPixelRect,
  strokePixelLine,
} from '../render/pixelArt';

export type PlantKind =
  | 'oak'
  | 'spruce'
  | 'poplar'
  | 'umbrella'
  | 'birch'
  | 'autumn'
  | 'blossom'
  | 'willow'
  | 'bush'
  | 'hedge'
  | 'rock'
  | 'log'
  | 'reeds';

export interface Foot {
  sx: number;
  sy: number;
}

interface Palette {
  lit: string;
  shade: string;
  high: string;
}

function leafPalette(pal: BuildingPalette, kind: PlantKind, v: number): Palette {
  const yellow = pal.flowers[1]!;
  let base: string;
  if (kind === 'blossom') base = pal.flowers[0]!;
  else if (kind === 'autumn') base = pal.m.roofOrange.lit;
  else if (kind === 'willow') base = mix(pal.leafLight, yellow, 0.18);
  else if (kind === 'birch') base = mix(pal.leafLight, yellow, 0.12);
  else if (v < 0.4) base = pal.leaf;
  else if (v < 0.75) base = mix(pal.leaf, pal.leafLight, 0.45);
  else base = mix(pal.leaf, yellow, 0.3);
  return {
    lit: base,
    shade: mix(base, pal.leafDark, kind === 'blossom' ? 0.35 : 0.55),
    high: kind === 'blossom' ? pal.white : mix(base, pal.leafLight, 0.55),
  };
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, colour: string): void {
  const points = Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    return { sx: x + Math.cos(angle) * rx, sy: y + Math.sin(angle) * ry };
  });
  fillPixelPolygon(ctx, points, colour);
}

function ellipsePath(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
  ctx.beginPath();
  for (let index = 0; index < 16; index++) {
    const angle = (index / 16) * Math.PI * 2;
    const sx = x + Math.cos(angle) * rx;
    const sy = y + Math.sin(angle) * ry;
    if (index === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
}

// A stepped patch of shade on the ground, falling to the lower right. The opacity
// comes from the theme's shadow parameters so a diffuse theme fades it too; the two
// discs are the one- or two-step edge.
function groundShadow(ctx: CanvasRenderingContext2D, f: Foot, rx: number, pal: BuildingPalette): void {
  ctx.save();
  ctx.globalAlpha = pal.shadowOpacity * 0.3;
  disc(ctx, f.sx + rx * 0.45, f.sy + 0.5, rx, rx * 0.5, pal.shadow);
  if (pal.shadowEdgeSteps === 2) {
    ctx.globalAlpha = pal.shadowOpacity * 0.42;
    disc(ctx, f.sx + rx * 0.55, f.sy + 0.3, rx * 0.58, rx * 0.28, pal.shadow);
  }
  ctx.restore();
}

// Lit disc over a shaded one, so the lower-right rim reads as shade.
function ball(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, p: Palette): void {
  const silhouette = Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    return { sx: cx + Math.cos(angle) * r, sy: cy + Math.sin(angle) * r };
  });
  fillPixelPolygon(ctx, silhouette, p.shade);
  ctx.save();
  ellipsePath(ctx, cx, cy, r, r);
  ctx.clip();
  disc(ctx, cx - r * 0.2, cy - r * 0.24, r * 0.92, r * 0.92, p.lit);
  ctx.restore();
  disc(ctx, cx - r * 0.38, cy - r * 0.42, r * 0.3, r * 0.26, p.high);
}

function trunk(ctx: CanvasRenderingContext2D, f: Foot, h: number, w: number, colour: string, ink: string): void {
  fillPixelRect(ctx, f.sx - w / 2, f.sy - h, w, h, colour);
  // A 1-2 lp contact band where the trunk meets the ground.
  const band = Math.min(2, h * 0.35);
  fillPixelRect(ctx, f.sx - w / 2, f.sy - band, w, band, mix(colour, ink, 0.4));
}

function round(ctx: CanvasRenderingContext2D, f: Foot, kind: PlantKind, v: number, s: number, pal: BuildingPalette): void {
  const p = leafPalette(pal, kind, v);
  const r = (kind === 'willow' ? 8.5 : 6.6 + v * 2) * s;
  groundShadow(ctx, f, r * 0.95, pal);
  trunk(ctx, f, 6 * s, 2.2 * s, kind === 'birch' ? pal.white : pal.trunk, pal.leafDark);
  ball(ctx, f.sx, f.sy - 6 * s - r * 0.75, r, p);
  if (kind === 'willow') {
    // Long hanging strands down the lit side.
    for (let i = -2; i <= 2; i++) {
      strokePixelLine(
        ctx,
        { sx: f.sx + i * r * 0.38, sy: f.sy - 6 * s - r * 0.2 },
        { sx: f.sx + i * r * 0.42, sy: f.sy - 1.5 * s },
        mix(p.lit, pal.leafDark, 0.35),
      );
    }
  }
}

function spruce(ctx: CanvasRenderingContext2D, f: Foot, v: number, s: number, pal: BuildingPalette): void {
  const lit = mix(pal.leafDark, pal.leaf, 0.2 + v * 0.18);
  const shade = mix(pal.leafDark, pal.outline, 0.32);
  const h = (31 + v * 11) * s;
  const layers = h > 36 * s ? 4 : 3;
  groundShadow(ctx, f, 7 * s, pal);
  trunk(ctx, f, 5 * s, 2.4 * s, pal.trunk, pal.leafDark);
  for (let i = 0; i < layers; i++) {
    const baseY = f.sy - 3.5 * s - (i * h * 0.78) / layers;
    const half = (8.2 - (i * 5.2) / layers) * s;
    const apexY = baseY - (h * 0.62) / (layers * 0.62 + 0.9) - 4 * s;
    fillPixelPolygon(ctx, [
      { sx: f.sx, sy: apexY },
      { sx: f.sx - half, sy: baseY },
      { sx: f.sx, sy: baseY + 1.6 * s },
    ], lit);
    fillPixelPolygon(ctx, [
      { sx: f.sx, sy: apexY },
      { sx: f.sx + half, sy: baseY },
      { sx: f.sx, sy: baseY + 1.6 * s },
    ], shade);
  }
}

function poplar(ctx: CanvasRenderingContext2D, f: Foot, v: number, s: number, pal: BuildingPalette): void {
  const p = leafPalette(pal, 'oak', v < 0.5 ? 0.2 : 0.6);
  const rx = 3.4 * s;
  const ry = (14 + v * 4) * s;
  groundShadow(ctx, f, 4 * s, pal);
  trunk(ctx, f, 4 * s, 1.8 * s, pal.trunk, pal.leafDark);
  const cy = f.sy - 3 * s - ry;
  disc(ctx, f.sx, cy, rx, ry, p.shade);
  ctx.save();
  ellipsePath(ctx, f.sx, cy, rx, ry);
  ctx.clip();
  disc(ctx, f.sx - rx * 0.28, cy - ry * 0.05, rx * 0.8, ry * 0.97, p.lit);
  ctx.restore();
}

function umbrella(ctx: CanvasRenderingContext2D, f: Foot, v: number, s: number, pal: BuildingPalette): void {
  const p = leafPalette(pal, 'oak', 0.1);
  groundShadow(ctx, f, 6 * s, pal);
  trunk(ctx, f, 15 * s, 1.8 * s, pal.trunk, pal.leafDark);
  disc(ctx, f.sx, f.sy - 15 * s, 8 * s, 3.6 * s, p.shade);
  disc(ctx, f.sx - 0.8 * s, f.sy - 16 * s, 7.4 * s, 3.1 * s, p.lit);
  disc(ctx, f.sx + (v - 0.5) * 6 * s, f.sy - 19 * s, 4.4 * s, 2.2 * s, p.lit);
}

function bush(ctx: CanvasRenderingContext2D, f: Foot, v: number, s: number, pal: BuildingPalette): void {
  const p = leafPalette(pal, 'oak', v);
  const r = (2.9 + v * 1.1) * s;
  groundShadow(ctx, f, r * 1.1, pal);
  ball(ctx, f.sx, f.sy - r * 0.8, r, p);
}

function hedge(ctx: CanvasRenderingContext2D, f: Foot, v: number, s: number, pal: BuildingPalette): void {
  const p = leafPalette(pal, 'oak', v);
  groundShadow(ctx, f, 8 * s, pal);
  for (const [dx, dy] of [[-5, -2], [0, -3], [5, -2]] as const) {
    disc(ctx, f.sx + dx * s, f.sy + dy * s, 4.2 * s, 2.8 * s, p.shade);
    disc(ctx, f.sx + (dx - 0.8) * s, f.sy + (dy - 1) * s, 3.6 * s, 2.3 * s, p.lit);
  }
}

function rock(ctx: CanvasRenderingContext2D, f: Foot, v: number, s: number, pal: BuildingPalette): void {
  const t = pal.m.wallStone;
  const w = (3 + v * 3.2) * s;
  const h = (2.6 + v * 2.4) * s;
  ctx.beginPath();
  ctx.moveTo(f.sx - w, f.sy);
  ctx.lineTo(f.sx - w * 0.7, f.sy - h * 0.8);
  ctx.lineTo(f.sx - w * 0.1, f.sy - h);
  ctx.lineTo(f.sx + w * 0.7, f.sy - h * 0.55);
  ctx.lineTo(f.sx + w, f.sy);
  ctx.closePath();
  ctx.fillStyle = t.lit;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(f.sx + w * 0.1, f.sy - h);
  ctx.lineTo(f.sx + w * 0.7, f.sy - h * 0.55);
  ctx.lineTo(f.sx + w, f.sy);
  ctx.lineTo(f.sx + w * 0.2, f.sy);
  ctx.closePath();
  ctx.fillStyle = t.shade;
  ctx.fill();
}

function log(ctx: CanvasRenderingContext2D, f: Foot, _v: number, s: number, pal: BuildingPalette): void {
  fillPixelRect(ctx, f.sx - 3 * s, f.sy - 1.6 * s, 6 * s, 1.8 * s, pal.woodDark);
  fillPixelRect(ctx, f.sx - 3 * s, f.sy - 1.8 * s, 6 * s, 0.9 * s, pal.wood);
}

function reeds(ctx: CanvasRenderingContext2D, f: Foot, v: number, s: number, pal: BuildingPalette): void {
  for (let i = -1; i <= 1; i++) {
    const h = (6 + ((i + 1) * 1.7 + v * 3)) * s;
    strokePixelLine(
      ctx,
      { sx: f.sx + i * 1.7 * s, sy: f.sy },
      { sx: f.sx + i * 1.9 * s + (i === 0 ? 0 : i * 0.6), sy: f.sy - h },
      mix(pal.leaf, pal.leafLight, 0.4),
    );
  }
  fillPixelRect(ctx, f.sx - 0.6 * s, f.sy - 7.6 * s, 1.2 * s, 2.2 * s, pal.woodDark);
}

export function paintPlant(ctx: CanvasRenderingContext2D, f: Foot, kind: PlantKind, v: number, s: number, pal: BuildingPalette): void {
  switch (kind) {
    case 'oak':
    case 'birch':
    case 'autumn':
    case 'blossom':
    case 'willow':
      round(ctx, f, kind, v, s, pal);
      break;
    case 'hedge':
      hedge(ctx, f, v, s, pal);
      break;
    case 'spruce':
      spruce(ctx, f, v, s, pal);
      break;
    case 'poplar':
      poplar(ctx, f, v, s, pal);
      break;
    case 'umbrella':
      umbrella(ctx, f, v, s, pal);
      break;
    case 'bush':
      bush(ctx, f, v, s, pal);
      break;
    case 'rock':
      rock(ctx, f, v, s, pal);
      break;
    case 'log':
      log(ctx, f, v, s, pal);
      break;
    case 'reeds':
      reeds(ctx, f, v, s, pal);
      break;
  }
}
