// The shape of a cliff, wall or slope face on screen.
//
// A face hangs straight down from one side of a tile's top surface. Its top edge
// is that side of the tile at the tile's own height; its bottom edge is the same
// side lowered to the neighbouring (lower) surface. Because both are produced by
// the same projection function from the same corner coordinates, the bottom edge
// of a face lands on exactly the same pixels as the matching edge of the lower
// tile's top. That is why there are no gaps (seams) between a face and the ground
// below it, and terrainPainter.test.ts checks it with exact comparisons.
import type { TerrainFace } from '../terrain/edges';
import { type ScreenPoint, mapToScreen } from './projection';

export type Side = 'south' | 'east';

// The four corners, top-left, top-right, bottom-right, bottom-left on screen.
export function faceCorners(x: number, y: number, side: Side, face: TerrainFace): ScreenPoint[] {
  // South side of tile (x, y): the edge from its W corner (x, y+1) to its S corner
  // (x+1, y+1). East side: from the S corner (x+1, y+1) to the E corner (x+1, y).
  const [ax, ay, bx, by] = side === 'south' ? [x, y + 1, x + 1, y + 1] : [x + 1, y + 1, x + 1, y];
  return [
    mapToScreen(ax, ay, face.top),
    mapToScreen(bx, by, face.top),
    mapToScreen(bx, by, face.bottom),
    mapToScreen(ax, ay, face.bottom),
  ];
}

// The line across the face at one height, for masonry courses and rock strata.
export function faceLine(
  x: number,
  y: number,
  side: Side,
  level: number,
): [ScreenPoint, ScreenPoint] {
  const [ax, ay, bx, by] = side === 'south' ? [x, y + 1, x + 1, y + 1] : [x + 1, y + 1, x + 1, y];
  return [mapToScreen(ax, ay, level), mapToScreen(bx, by, level)];
}
