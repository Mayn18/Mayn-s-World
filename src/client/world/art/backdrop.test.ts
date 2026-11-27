import { describe, expect, it } from 'vitest';
import { SCENE_HEIGHT, SCENE_WIDTH, createMeadowBackdrop } from './backdrop';
import { spritePaths } from '../sprite';
import * as sprites from './sprites';

describe('meadow backdrop', () => {
  const backdrop = createMeadowBackdrop();

  it('is the size of the scene canvas', () => {
    expect(backdrop.width).toBe(SCENE_WIDTH);
    expect(backdrop.height).toBe(SCENE_HEIGHT);
  });

  it('covers every pixel exactly once', () => {
    // The encoder turns a fully painted grid into rectangles. If the areas add
    // up to the canvas, and none stick out, nothing is missing or doubled
    // (rectangles built from a grid cannot overlap).
    const area = backdrop.runs.reduce((sum, run) => sum + run.width * run.height, 0);
    expect(area).toBe(SCENE_WIDTH * SCENE_HEIGHT);

    for (const run of backdrop.runs) {
      expect(run.x).toBeGreaterThanOrEqual(0);
      expect(run.y).toBeGreaterThanOrEqual(0);
      expect(run.x + run.width).toBeLessThanOrEqual(SCENE_WIDTH);
      expect(run.y + run.height).toBeLessThanOrEqual(SCENE_HEIGHT);
    }
  });

  it('draws the same picture every time', () => {
    expect(createMeadowBackdrop()).toEqual(backdrop);
  });

  it('stays small enough to ship in the page', () => {
    const size = spritePaths(backdrop).reduce((sum, path) => sum + path.d.length, 0);
    expect(size).toBeLessThan(40_000);
  });
});

describe('sprite sheet', () => {
  it('parses every sprite (a typo in the art would throw on import)', () => {
    const all = Object.values(sprites);
    expect(all.length).toBeGreaterThan(10);
    for (const sprite of all) {
      expect(sprite.runs.length).toBeGreaterThan(0);
    }
  });
});
