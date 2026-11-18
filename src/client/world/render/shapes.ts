// Two small canvas drawing helpers shared by the terrain and water painters.
import type { ScreenPoint } from './projection';

// Fills a polygon. The fill is followed by a 1 px stroke of the same colour on
// purpose: neighbouring polygons share edges, and the canvas smooths (anti-
// aliases) diagonal edges, which would leave faint hairline gaps between them.
// The stroke grows each shape by half a pixel, which hides the seams.
export function fillPolygon(ctx: CanvasRenderingContext2D, points: ScreenPoint[], colour: string) {
  ctx.beginPath();
  points.forEach(({ sx, sy }, i) => (i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy)));
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.fill();
  ctx.stroke();
}

export function strokeLine(
  ctx: CanvasRenderingContext2D,
  from: ScreenPoint,
  to: ScreenPoint,
  colour: string,
  width = 1,
) {
  ctx.beginPath();
  ctx.moveTo(from.sx, from.sy);
  ctx.lineTo(to.sx, to.sy);
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.stroke();
}
