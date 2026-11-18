// A "patch" is a rectangular window onto the map. Milestone 1 draws one patch of
// 32 x 24 tiles instead of the whole 80 x 60 town, which keeps the first result
// small enough to understand. The whole-map renderer later uses the same idea
// with a patch the size of the map.
import type { Terrain, TileCoord } from '../data/types';
import { LEVEL_PX, TILE_H, TILE_W, mapToScreen } from './projection';

export interface Patch {
  x: number; // west-most tile column
  y: number; // north-most tile row
  width: number; // in tiles
  height: number;
}

// Chosen because it holds both terrain steps (level 2 down to 1 to 0), cliff
// faces, the town's southern river and the start of the plaza.
export const TERRAIN_PATCH: Patch = { x: 20, y: 30, width: 32, height: 24 };

export function tilesInPatch(patch: Patch): TileCoord[] {
  const tiles: TileCoord[] = [];
  for (let y = patch.y; y < patch.y + patch.height; y++) {
    for (let x = patch.x; x < patch.x + patch.width; x++) {
      tiles.push({ x, y });
    }
  }
  return tiles;
}

// The highest elevation level inside the patch; it decides how much room to
// leave above the drawing.
export function maxLevelInPatch(terrain: Terrain, patch: Patch): number {
  return Math.max(...tilesInPatch(patch).map(({ x, y }) => terrain.levels[y]![x]!));
}

export function inPatch(patch: Patch, x: number, y: number): boolean {
  return (
    x >= patch.x && x < patch.x + patch.width && y >= patch.y && y < patch.y + patch.height
  );
}

// The rectangle, in screen pixels, that a patch's drawing covers. The canvas is
// made exactly this size, so nothing is cropped and no space is wasted.
//
// On screen a rectangle of map tiles is a big diamond. Its far corners are:
//   west  = bottom-left map corner  -> smallest screenX
//   east  = top-right map corner    -> largest screenX
//   north = top-left map corner     -> smallest screenY (before elevation)
//   south = bottom-right map corner -> largest screenY
// The highest tiles are lifted by maxLevel * LEVEL_PX, and the edge tiles have a
// one-level "slab" below them (see terrainPainter.ts), which adds LEVEL_PX at the
// bottom.
export interface Bounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function patchBounds(patch: Patch, maxLevel: number): Bounds {
  const west = mapToScreen(patch.x, patch.y + patch.height).sx;
  const east = mapToScreen(patch.x + patch.width, patch.y).sx;
  const north = mapToScreen(patch.x, patch.y).sy - maxLevel * LEVEL_PX;
  const south = mapToScreen(patch.x + patch.width, patch.y + patch.height).sy + LEVEL_PX;
  return { left: west, top: north, width: east - west, height: south - north };
}

// Exported so tests can state the expected size in terms of the tile size.
export const PATCH_PIXEL_WIDTH = (patch: Patch): number =>
  ((patch.width + patch.height) * TILE_W) / 2;
export const PATCH_PIXEL_DEPTH = (patch: Patch): number =>
  ((patch.width + patch.height) * TILE_H) / 2;
