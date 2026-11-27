// Isometric projection: where a tile on the map appears on the screen.
//
// The map is a flat grid of squares. To draw it as if viewed from above at an
// angle, every square is turned into a diamond, like this:
//
//        map (top view)                 screen (isometric)
//     x ->                                       N
//    y  +---+---+                              /   \          one tile is
//    |  | 0 | 1 |           becomes          W       E        32 px wide and
//    v  +---+---+                              \   /          16 px tall
//       | 2 | 3 |                                S
//       +---+---+
//
// The corners of tile (x, y) are named after where they point on the map: N is
// the corner at map point (x, y), E is (x+1, y), S is (x+1, y+1) and W is
// (x, y+1).
//
// THE MATHS
// Moving one tile east (x + 1) moves the picture 16 px right and 8 px down.
// Moving one tile south (y + 1) moves it 16 px LEFT and 8 px down. So for a
// point at map position (x, y):
//
//     screenX = (x - y) * 16        = (x - y) * TILE_W / 2
//     screenY = (x + y) * 8         = (x + y) * TILE_H / 2
//
// This is the classic "2:1" isometric view: the diamond is twice as wide as it
// is tall, which lines up neatly on the pixel grid (a line moves 2 px across for
// every 1 px down).
//
// ELEVATION
// Height does not change x or y on the map. It only lifts the picture straight
// up the screen: each level is LEVEL_PX pixels, so
//
//     screenY = (x + y) * 8 - level * 10
//
// Going backwards (screen to map) is the same two equations solved for x and y;
// see screenToMap. It needs to be told the level, because a point on screen is
// ambiguous without it: the same pixel could be level 0 further south or level 2
// further north.
//
// Everything here is a pure function of numbers. No canvas, no React, so it is
// easy to test.
import type { TileCoord } from '../data/types';

export const TILE_W = 32;
export const TILE_H = 16;
// How far up the screen one elevation level lifts the ground.
export const LEVEL_PX = 10;

export interface ScreenPoint {
  sx: number;
  sy: number;
}

// Map point -> screen point. x and y may be fractions (x = 3.5 is the middle of
// tile 3), which is how tile centres and corners are found.
export function mapToScreen(x: number, y: number, level = 0): ScreenPoint {
  return {
    sx: ((x - y) * TILE_W) / 2,
    sy: ((x + y) * TILE_H) / 2 - level * LEVEL_PX,
  };
}

// Screen point -> map point, assuming the ground is at the given level.
// Algebra: add the two equations to get x + y, subtract them to get x - y.
//   a = screenX / 16 = x - y
//   b = (screenY + level * 10) / 8 = x + y
//   x = (a + b) / 2,  y = (b - a) / 2
export function screenToMap(sx: number, sy: number, level = 0): { x: number; y: number } {
  const a = sx / (TILE_W / 2);
  const b = (sy + level * LEVEL_PX) / (TILE_H / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}

// The four corners of a tile's top surface, in drawing order (clockwise on
// screen, starting at the top).
export function tileCorners(x: number, y: number, level: number): ScreenPoint[] {
  return [
    mapToScreen(x, y, level), // N
    mapToScreen(x + 1, y, level), // E
    mapToScreen(x + 1, y + 1, level), // S
    mapToScreen(x, y + 1, level), // W
  ];
}

// The middle of a tile's top surface.
export function tileCenter({ x, y }: TileCoord, level: number): ScreenPoint {
  return mapToScreen(x + 0.5, y + 0.5, level);
}
