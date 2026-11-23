import type { Bounds } from './bounds';
import type { ViewTransform } from './viewTransform';

interface TransformContext {
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  translate(x: number, y: number): void;
}

export function setWorldTransform(
  ctx: TransformContext,
  view: ViewTransform,
  dpr: number,
  bounds: Pick<Bounds, 'left' | 'top'>,
): void {
  const scale = view.scale * dpr;
  ctx.setTransform(scale, 0, 0, scale, view.offsetX * dpr, view.offsetY * dpr);
  ctx.translate(-bounds.left, -bounds.top);
}
