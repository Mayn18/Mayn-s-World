// How big the finished picture of the whole world is, in picture pixels.
//
// This is what the view transform fits into the window (viewTransform.ts) and
// what the canvas draws relative to. It replaces the fixed 32 x 24 patch: the
// picture is now the whole map plus its cut sides.
//
// On screen the rectangular map is a big diamond. Its extremes are:
//   west   = the map's bottom-left corner  -> smallest screenX
//   east   = the map's top-right corner    -> largest screenX
//   top    = the highest tile corner       -> smallest screenY (height lifts it)
//   bottom = the bottom-right corner, taken down to the foot of the cut sides
import type { TerrainModel } from '../terrain/model';
import { SKIRT_LEVELS } from '../terrain/model';
import { mapToScreen } from './projection';

export interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

// `reachTop` is the highest point (smallest screenY) anything built on the ground
// reaches, so tall buildings are not cut off at the top of the picture.
export function worldBounds(model: TerrainModel, reachTop = Infinity): Bounds {
  const { width, height } = model.terrain;
  const west = mapToScreen(0, height).sx;
  const east = mapToScreen(width, 0).sx;
  const bottom = mapToScreen(width, height, -SKIRT_LEVELS).sy;

  // A tile's highest point is its north corner, at the tile's own surface height.
  let top = Infinity;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      top = Math.min(top, mapToScreen(x, y, model.surface[y]![x]!).sy);
    }
  }
  top = Math.min(top, reachTop);
  return { left: west, top, width: east - west, height: bottom - top };
}
