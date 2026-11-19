// The baked town as something the canvas can draw: one bitmap, made once.
//
// Baking takes a moment (it draws every tile pixel by pixel), so it happens the
// first time the world is shown and the result is kept for the life of the page.
import { type BakedWorld, bakeWorld } from './bake/bakeWorld';
import { ART } from './bake/space';
import { type Bounds } from './render/bounds';
import { townModel } from './terrain/town';
import type { Theme } from './themes';

export interface TownBitmap {
  canvas: HTMLCanvasElement;
  // The picture's size and where it starts, in screen (projection) pixels.
  bounds: Bounds;
}

const cache = new Map<string, TownBitmap>();

export function townBitmap(theme: Theme): TownBitmap | null {
  const cached = cache.get(theme.id);
  if (cached) return cached;

  const baked: BakedWorld = bakeWorld(townModel, theme);
  const canvas = document.createElement('canvas');
  canvas.width = baked.space.width;
  canvas.height = baked.space.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.putImageData(new ImageData(baked.buffer.toBytes(), baked.space.width, baked.space.height), 0, 0);

  const result: TownBitmap = {
    canvas,
    bounds: {
      left: baked.space.left,
      top: baked.space.top,
      width: baked.space.width / ART,
      height: baked.space.height / ART,
    },
  };
  cache.set(theme.id, result);
  return result;
}
