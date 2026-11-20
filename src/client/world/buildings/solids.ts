// Round solids for the castle's towers and turrets: a cylinder and a cone.
//
// Everything else in the town is made of boxes and roof planes (painter.ts). A round
// tower has no flat faces, so it is drawn as the silhouette of a cylinder with the
// same two-tone light rule as everywhere else: the left (south-west) part is lit, the
// right (east) part is shaded. A circle of radius r tiles lying on the ground projects
// to an ellipse r * 22.6 px wide and r * 11.3 px tall in the 2:1 projection.
import { type ScreenPoint } from '../render/projection';
import { type Origin, at } from './geometry';
import type { Tone } from './palette';

const SQRT2 = Math.SQRT2;

// Half-width and half-height, in px, of a circle of `r` tiles on the ground.
export function ellipseRadii(r: number): { rx: number; ry: number } {
  return { rx: 16 * r * SQRT2, ry: 8 * r * SQRT2 };
}

// How much of the right-hand side is in shade (fraction of the width).
const SHADE_FROM = 0.2;

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
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(base.sx, base.sy, rx, ry, 0, 0, Math.PI, false);
  ctx.lineTo(top.sx - rx, top.sy);
  ctx.ellipse(top.sx, top.sy, rx, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fillStyle = tone.lit;
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = tone.shade;
  ctx.fillRect(base.sx + rx * SHADE_FROM, top.sy - ry, rx * 2, base.sy - top.sy + ry * 2);
  ctx.restore();
  // A seam keeps the base from melting into the ground, and the flat top is lighter.
  ctx.beginPath();
  ctx.ellipse(top.sx, top.sy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = tone.light;
  ctx.fill();
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
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(base.sx - rx, base.sy);
  ctx.lineTo(apex.sx, apex.sy);
  ctx.lineTo(base.sx + rx, base.sy);
  ctx.ellipse(base.sx, base.sy, rx, ry, 0, 0, Math.PI, false);
  ctx.closePath();
  ctx.fillStyle = tone.lit;
  ctx.fill();
  ctx.clip();
  // Shaded east side: a triangle from the apex down to the right.
  ctx.beginPath();
  ctx.moveTo(apex.sx, apex.sy);
  ctx.lineTo(base.sx + rx + 1, base.sy);
  ctx.lineTo(base.sx + rx + 1, base.sy + ry + 1);
  ctx.lineTo(base.sx + rx * 0.12, base.sy + ry + 1);
  ctx.closePath();
  ctx.fillStyle = tone.shade;
  ctx.fill();
  ctx.restore();
  // One facet line from the tip, as in the reference's cone roofs.
  ctx.beginPath();
  ctx.moveTo(apex.sx, apex.sy);
  ctx.lineTo(base.sx + rx * 0.12, base.sy + ry);
  ctx.strokeStyle = tone.dark;
  ctx.lineWidth = 0.7;
  ctx.stroke();
}

// A point on a cylinder's surface facing the viewer: angle 0 is east, 90 degrees is south.
export function onCylinder(o: Origin, cx: number, cy: number, r: number, degrees: number, z: number): ScreenPoint {
  const a = (degrees * Math.PI) / 180;
  return at(o, cx + r * Math.cos(a), cy + r * Math.sin(a), z);
}
