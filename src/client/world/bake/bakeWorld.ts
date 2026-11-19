// Draws the whole town, once, into a pixel buffer.
//
// The town does not change while you look at it (ambient life is drawn on top of
// this picture, later), so it is drawn once at start-up and then simply shown.
// That keeps panning and zooming cheap: the browser scales one bitmap.
import { PixelBuffer } from '../pixel/buffer';
import { worldBounds } from '../render/bounds';
import { backToFront } from '../render/depth';
import type { TerrainModel } from '../terrain/model';
import type { Theme } from '../themes';
import { buildMaterials } from './materials';
import { ART, type ArtSpace } from './space';
import { createBakeContext, paintTile } from './terrainBake';

export interface BakedWorld {
  buffer: PixelBuffer;
  space: ArtSpace;
}

export function bakeWorld(model: TerrainModel, theme: Theme): BakedWorld {
  const b = worldBounds(model);
  const space: ArtSpace = {
    left: b.left,
    top: b.top,
    width: Math.ceil(b.width * ART),
    height: Math.ceil(b.height * ART),
  };
  const buffer = new PixelBuffer(space.width, space.height);
  const ctx = createBakeContext(model, buildMaterials(theme), space);
  for (const { x, y } of backToFront(model.order)) paintTile(buffer, ctx, x, y);
  return { buffer, space };
}
