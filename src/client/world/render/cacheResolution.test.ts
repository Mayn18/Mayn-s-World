import { describe, expect, it } from 'vitest';
import { cacheResolution, MAX_TERRAIN_CACHE_BYTES } from './cacheResolution';

const townBounds = { left: 0, top: 0, width: 2240, height: 1244 };

describe('cacheResolution', () => {
  it('chooses a power-of-two resolution covering the maximum view scale', () => {
    const resolution = cacheResolution(townBounds, 0.46 * 4, 1);

    expect(resolution.scale).toBe(2);
    expect(resolution.width).toBe(4480);
    expect(resolution.height).toBe(2488);
  });

  it('accounts for device pixel ratio while respecting the cache memory budget', () => {
    const resolution = cacheResolution(townBounds, 0.46 * 4, 2);

    expect(resolution.scale).toBeGreaterThan(2);
    expect(resolution.bytes).toBeLessThanOrEqual(MAX_TERRAIN_CACHE_BYTES);
  });

  it('keeps the minimum cache resolution for an invalid pixel ratio', () => {
    const resolution = cacheResolution(townBounds, 0.1, Number.NaN);

    expect(resolution.scale).toBe(1);
  });
});
