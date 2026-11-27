// Drawing order ("depth sorting").
//
// A canvas has no idea what is in front of what: whatever is drawn last ends up
// on top. So to make near things hide far things, we draw far things first. This
// is the "painter's algorithm", named after a painter who paints the sky and
// mountains before the trees in front of them.
//
// WHICH TILES ARE FAR?
// The viewer looks from the south-east corner of the map towards the north-west.
// On screen, screenY = (x + y) * 8 - elevation: a larger x + y means lower on
// the screen, which means nearer the viewer. So the order is simply:
//
//     draw tiles with the smallest (x + y) first, the largest last.
//
// Tiles with the same x + y lie on one diagonal, side by side on screen, so they
// do not overlap each other and their relative order does not matter. We break
// the tie by x only so the result is the same every time (a stable, testable
// order).
//
// WHY THIS IS ENOUGH FOR TERRAIN
// A tall tile hides what is behind it, and what is behind it has a smaller
// x + y, so it was drawn earlier and is correctly covered. The cliff faces drawn
// by terrainPainter.ts hang straight down from a tile's south and east edges
// and stop exactly where the next (lower) tile's surface begins, so they never
// need to be drawn over anything.
//
// Buildings, which cover several tiles and stand tall, will need a smarter key
// (their rule is documented when they are added). Only terrain needs this
// simple one.
import type { TileCoord } from '../data/types';

export function depthKey({ x, y }: TileCoord): number {
  return x + y;
}

// Returns a new array, back (far) to front (near). The input is not changed.
export function backToFront<T extends TileCoord>(tiles: readonly T[]): T[] {
  return [...tiles].sort((a, b) => depthKey(a) - depthKey(b) || a.x - b.x);
}
