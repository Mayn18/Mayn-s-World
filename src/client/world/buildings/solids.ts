// Round solids for the castle's towers and turrets: a cylinder and a cone.
//
// Everything else in the town is made of boxes and roof planes (painter.ts). A round
// tower has no flat faces, so it is drawn as the silhouette of a cylinder with the
// same two-tone light rule as everywhere else: the left (south-west) part is lit, the
// right (east) part is shaded. A circle of radius r tiles lying on the ground projects
// to an ellipse r * 22.6 px wide and r * 11.3 px tall in the 2:1 projection.
import { type ScreenPoint } from '../render/projection';
import {
  fillPixelPolygon,
  fillPixelRect,
  strokePixelPolygon,
  strokePixelLine,
} from '../render/pixelArt';
import { type Origin, at } from './geometry';
import type { Tone } from './palette';
import { curvedTone } from './palette';

const SQRT2 = Math.SQRT2;

// Half-width and half-height, in px, of a circle of `r` tiles on the ground.
export function ellipseRadii(r: number): { rx: number; ry: number } {
  return { rx: 16 * r * SQRT2, ry: 8 * r * SQRT2 };
}

// How much of the right-hand side is in shade (fraction of the width).
const SHADE_FROM = 0.2;

function ellipsePoints(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  start = 0,
  end = Math.PI * 2,
): ScreenPoint[] {
  const steps = Math.max(8, Math.ceil(Math.abs(end - start) / (Math.PI / 8)));
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = start + ((end - start) * index) / steps;
    return { sx: cx + Math.cos(angle) * rx, sy: cy + Math.sin(angle) * ry };
  });
}

export function cylinder(
  ctx: CanvasRenderingContext2D,
  o: Origin,
  cx: number,
  cy: number,
  r: number,
  z0: number,
  z1: number,
  tone: Tone,
): void {
  const { rx, ry } = ellipseRadii(r);
  const base = at(o, cx, cy, z0);
  const top = at(o, cx, cy, z1);
  const side = [
    ...ellipsePoints(base.sx, base.sy, rx, ry, 0, Math.PI),
    ...ellipsePoints(top.sx, top.sy, rx, ry, Math.PI, 0),
  ];
  ctx.save();
  const [lit, mid, shade] = curvedTone(tone);
  fillPixelPolygon(ctx, side, lit);
  strokePixelPolygon(ctx, side, tone.dark);
  ctx.beginPath();
  side.forEach(({ sx, sy }, index) => (index ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy)));
  ctx.closePath();
  ctx.clip();
  fillPixelRect(ctx, base.sx + rx * SHADE_FROM, top.sy - ry, rx * 2, base.sy - top.sy + ry * 2, shade);
  fillPixelRect(ctx, base.sx + rx * (SHADE_FROM - 0.18), top.sy - ry, rx * 0.36, base.sy - top.sy + ry * 2, mid);
  // A clipped contact band at the foot, not an unclipped bar on the ground.
  fillPixelRect(ctx, base.sx - rx, base.sy - 2.4, rx * 2, 2.4, shade);
  ctx.restore();
  const cap = ellipsePoints(top.sx, top.sy, rx, ry, 0, Math.PI * 2);
  fillPixelPolygon(ctx, cap, tone.light);
  strokePixelPolygon(ctx, cap, tone.dark);
}

// A cone sitting on a cylinder's top, a little wider than it (the eaves).
export function cone(
  ctx: CanvasRenderingContext2D,
  o: Origin,
  cx: number,
  cy: number,
  r: number,
  z: number,
  rise: number,
  tone: Tone,
): void {
  const { rx, ry } = ellipseRadii(r);
  const base = at(o, cx, cy, z);
  const apex: ScreenPoint = { sx: base.sx, sy: base.sy - rise };
  const cap = ellipsePoints(base.sx, base.sy, rx, ry, 0, Math.PI);
  const roof = [
    { sx: base.sx - rx, sy: base.sy },
    apex,
    { sx: base.sx + rx, sy: base.sy },
    ...cap.slice(1),
  ];
  fillPixelPolygon(ctx, roof, tone.lit);
  const shade = [
    apex,
    { sx: base.sx + rx, sy: base.sy },
    { sx: base.sx + rx * 0.12, sy: base.sy + ry },
  ];
  fillPixelPolygon(ctx, shade, tone.shade);
  for (const step of [0.25, 0.5, 0.75]) {
    const y = apex.sy + rise * step;
    const halfWidth = rx * step;
    strokePixelLine(
      ctx,
      { sx: base.sx - halfWidth, sy: y },
      { sx: base.sx + halfWidth, sy: y },
      tone.dark,
    );
  }
  strokePixelPolygon(ctx, roof, tone.dark);
  strokePixelLine(ctx, apex, { sx: base.sx + rx * 0.12, sy: base.sy + ry }, tone.dark);
}

// A point on a cylinder's surface facing the viewer: angle 0 is east, 90 degrees is south.
export function onCylinder(o: Origin, cx: number, cy: number, r: number, degrees: number, z: number): ScreenPoint {
  const a = (degrees * Math.PI) / 180;
  return at(o, cx + r * Math.cos(a), cy + r * Math.sin(a), z);
}
