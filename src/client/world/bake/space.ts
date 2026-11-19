// How the picture's coordinates relate to pixels in the baked bitmap.
//
// Three coordinate systems are in play, and mixing them up is the commonest
// mistake in this code:
//   map     tile units: (x, y) tiles east and south of the north-west corner
//   screen  "projection pixels": what mapToScreen returns (32 x 16 tiles, 10 px a level)
//   art     pixels of the baked bitmap: screen pixels x ART, shifted so the
//           picture's top-left is (0, 0)
//
// ART is how many art pixels make one screen pixel. At 2 a tile is 64 x 32 art
// pixels, which gives the fine detail of the reference artwork (windows, bricks,
// single leaves) while a pixel stays a visible hard square when zoomed in.
import { type ScreenPoint } from '../render/projection';

export const ART = 2;

export interface ArtSpace {
  // The picture's top-left in screen coordinates, and its size in art pixels.
  left: number;
  top: number;
  width: number;
  height: number;
}

export function toArt(space: ArtSpace, p: ScreenPoint): { x: number; y: number } {
  return { x: (p.sx - space.left) * ART, y: (p.sy - space.top) * ART };
}

export function fromArt(space: ArtSpace, x: number, y: number): ScreenPoint {
  return { sx: x / ART + space.left, sy: y / ART + space.top };
}
