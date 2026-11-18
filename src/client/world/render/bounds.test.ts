import { describe, expect, it } from 'vitest';
import { townModel } from '../terrain/town';
import { SKIRT_LEVELS } from '../terrain/model';
import { worldBounds } from './bounds';
import { LEVEL_PX, TILE_H, TILE_W, mapToScreen } from './projection';

describe('worldBounds', () => {
  const bounds = worldBounds(townModel);

  it('is as wide as the map diamond: (80 + 60) half-tiles', () => {
    expect(bounds.width).toBe((80 + 60) * (TILE_W / 2));
    expect(bounds.left).toBe(-60 * (TILE_W / 2));
  });

  it('contains every corner of every tile and the foot of the cut sides', () => {
    const right = bounds.left + bounds.width;
    const bottom = bounds.top + bounds.height;
    for (let y = 0; y <= 60; y++) {
      for (let x = 0; x <= 80; x++) {
        const level = townModel.surface[Math.min(y, 59)]![Math.min(x, 79)]!;
        const p = mapToScreen(x, y, level);
        expect(p.sx).toBeGreaterThanOrEqual(bounds.left);
        expect(p.sx).toBeLessThanOrEqual(right);
        expect(p.sy).toBeGreaterThanOrEqual(bounds.top);
        expect(p.sy).toBeLessThanOrEqual(bottom);
      }
    }
    expect(mapToScreen(80, 60, -SKIRT_LEVELS).sy).toBe(bottom);
  });

  it('is exactly as tall as the highest ground lifts it plus the map and skirt', () => {
    const rawHeight = (80 + 60) * (TILE_H / 2) + SKIRT_LEVELS * LEVEL_PX;
    expect(bounds.height).toBeGreaterThan(rawHeight);
    expect(bounds.height).toBeLessThanOrEqual(rawHeight + 5 * LEVEL_PX + TILE_H);
  });
});
