import { describe, expect, it } from 'vitest';
import type { Terrain } from '../data/types';
import {
  PATCH_PIXEL_DEPTH,
  PATCH_PIXEL_WIDTH,
  TERRAIN_PATCH,
  inPatch,
  maxLevelInPatch,
  patchBounds,
  tilesInPatch,
} from './patch';
import { LEVEL_PX } from './projection';

describe('TERRAIN_PATCH', () => {
  it('is the approved 32 x 24 tile window', () => {
    expect(TERRAIN_PATCH).toEqual({ x: 20, y: 30, width: 32, height: 24 });
    expect(tilesInPatch(TERRAIN_PATCH)).toHaveLength(32 * 24);
  });
});

describe('inPatch', () => {
  it('includes the first and last tile and excludes the ones just outside', () => {
    expect(inPatch(TERRAIN_PATCH, 20, 30)).toBe(true);
    expect(inPatch(TERRAIN_PATCH, 51, 53)).toBe(true);
    expect(inPatch(TERRAIN_PATCH, 52, 53)).toBe(false);
    expect(inPatch(TERRAIN_PATCH, 51, 54)).toBe(false);
    expect(inPatch(TERRAIN_PATCH, 19, 30)).toBe(false);
  });
});

describe('patchBounds', () => {
  it('is as wide as (columns + rows) half-tiles', () => {
    // 32 + 24 = 56 half-tile steps of 16 px = 896 px.
    expect(patchBounds(TERRAIN_PATCH, 2).width).toBe(896);
    expect(patchBounds(TERRAIN_PATCH, 2).width).toBe(PATCH_PIXEL_WIDTH(TERRAIN_PATCH));
  });

  it('adds room for the tallest ground above and the edge slab below', () => {
    const flat = patchBounds(TERRAIN_PATCH, 0).height;
    expect(flat).toBe(PATCH_PIXEL_DEPTH(TERRAIN_PATCH) + LEVEL_PX);
    expect(patchBounds(TERRAIN_PATCH, 2).height).toBe(flat + 2 * LEVEL_PX);
  });

  it('starts at the west-most and north-most points of the drawing', () => {
    const b = patchBounds(TERRAIN_PATCH, 2);
    // west corner = map point (20, 54): (20 - 54) * 16
    expect(b.left).toBe(-544);
    // north corner = map point (20, 30) lifted by two levels: 50 * 8 - 20
    expect(b.top).toBe(380);
  });
});

describe('maxLevelInPatch', () => {
  it('finds the highest tile inside the patch only', () => {
    const terrain: Terrain = {
      width: 3,
      height: 1,
      levels: [[5, 1, 3]],
      water: [[false, false, false]],
    };
    expect(maxLevelInPatch(terrain, { x: 1, y: 0, width: 2, height: 1 })).toBe(3);
  });
});
