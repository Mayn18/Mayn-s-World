import type { Bounds } from './bounds';
import type { ViewTransform } from './viewTransform';

interface PictureTransformContext {
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
}

interface TransformContext extends PictureTransformContext {
  translate(x: number, y: number): void;
}

export function setPictureTransform(
  ctx: PictureTransformContext,
  view: ViewTransform,
  dpr: number,
): void {
  const scale = view.scale * dpr;
  ctx.setTransform(scale, 0, 0, scale, view.offsetX * dpr, view.offsetY * dpr);
}

export function setWorldTransform(
  ctx: TransformContext,
  view: ViewTransform,
  dpr: number,
  bounds: Pick<Bounds, 'left' | 'top'>,
): void {
  setPictureTransform(ctx, view, dpr);
  ctx.translate(-bounds.left, -bounds.top);
}
