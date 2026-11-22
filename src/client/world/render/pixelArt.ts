import type { ScreenPoint } from './projection';

export const ART_PIXEL = 2;

export interface PixelCoursePalette {
  line: string;
  joint: string;
}

type Quad = readonly ScreenPoint[];

export function snapArtPixel(value: number): number {
  return Math.round(value / ART_PIXEL) * ART_PIXEL;
}

function snapPoint(point: ScreenPoint): ScreenPoint {
  return { sx: snapArtPixel(point.sx), sy: snapArtPixel(point.sy) };
}

export function fillPixelPolygon(
  ctx: CanvasRenderingContext2D,
  points: readonly ScreenPoint[],
  colour: string,
): void {
  if (points.length < 3) return;
  ctx.beginPath();
  points.forEach((point, index) => {
    const snapped = snapPoint(point);
    if (index === 0) ctx.moveTo(snapped.sx, snapped.sy);
    else ctx.lineTo(snapped.sx, snapped.sy);
  });
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function strokePixelPolygon(
  ctx: CanvasRenderingContext2D,
  points: readonly ScreenPoint[],
  colour: string,
  width = ART_PIXEL,
): void {
  if (points.length < 2) return;
  ctx.beginPath();
  points.forEach((point, index) => {
    const snapped = snapPoint(point);
    if (index === 0) ctx.moveTo(snapped.sx, snapped.sy);
    else ctx.lineTo(snapped.sx, snapped.sy);
  });
  ctx.closePath();
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(ART_PIXEL, snapArtPixel(width));
  ctx.stroke();
}

export function strokePixelLine(
  ctx: CanvasRenderingContext2D,
  from: ScreenPoint,
  to: ScreenPoint,
  colour: string,
  width = ART_PIXEL,
): void {
  const start = snapPoint(from);
  const end = snapPoint(to);
  ctx.beginPath();
  ctx.moveTo(start.sx, start.sy);
  ctx.lineTo(end.sx, end.sy);
  ctx.strokeStyle = colour;
  ctx.lineWidth = Math.max(ART_PIXEL, snapArtPixel(width));
  ctx.stroke();
}

export function fillPixelRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  colour: string,
): void {
  const left = snapArtPixel(x);
  const top = snapArtPixel(y);
  const right = snapArtPixel(x + width);
  const bottom = snapArtPixel(y + height);
  if (right <= left || bottom <= top) return;
  ctx.fillStyle = colour;
  ctx.fillRect(left, top, right - left, bottom - top);
}

function interpolate(a: ScreenPoint, b: ScreenPoint, amount: number): ScreenPoint {
  return {
    sx: a.sx + (b.sx - a.sx) * amount,
    sy: a.sy + (b.sy - a.sy) * amount,
  };
}

function quadPoint(quad: Quad, u: number, v: number): ScreenPoint {
  return interpolate(
    interpolate(quad[0]!, quad[1]!, u),
    interpolate(quad[3]!, quad[2]!, u),
    v,
  );
}

export function paintPixelCourses(
  ctx: CanvasRenderingContext2D,
  quad: Quad,
  rows: number,
  columns: number,
  palette: PixelCoursePalette,
): void {
  if (quad.length < 4) return;
  const rowCount = Math.max(1, Math.floor(rows));
  const columnCount = Math.max(1, Math.floor(columns));
  for (let row = 1; row < rowCount; row++) {
    const v = row / rowCount;
    strokePixelLine(ctx, quadPoint(quad, 0, v), quadPoint(quad, 1, v), palette.line);
  }
  for (let row = 0; row < rowCount; row++) {
    const offset = row % 2 === 0 ? 0.5 : 0;
    const v0 = row / rowCount;
    const v1 = (row + 1) / rowCount;
    for (let column = 0; column < columnCount; column++) {
      const u = (column + offset) / columnCount;
      if (u <= 0 || u >= 1) continue;
      strokePixelLine(ctx, quadPoint(quad, u, v0), quadPoint(quad, u, v1), palette.joint);
    }
  }
}
