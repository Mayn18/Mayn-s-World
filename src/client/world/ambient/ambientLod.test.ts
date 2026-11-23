import { describe, expect, it } from 'vitest';
import { cameraView, fitContain, initialCamera } from '../render/viewTransform';
import { actorsVisible, fireflyCount, waterTileEffectVisible } from './ambientLod';

const viewports = [
  [390, 844],
  [844, 390],
  [820, 1180],
  [1440, 900],
] as const;

describe('ambient level of detail', () => {
  it('uses camera zoom rather than fit scale across representative viewport sizes', () => {
    for (const [width, height] of viewports) {
      const fit = fitContain(width, height, 2240, 1200);
      const camera = { ...initialCamera(2240, 1200), zoom: 2.8 };
      const view = cameraView(fit, width, height, camera);

      expect(view.scale / fit.scale).toBeCloseTo(camera.zoom, 12);
      expect(actorsVisible(camera.zoom)).toBe(true);
      expect(fireflyCount(20, camera.zoom)).toBe(20);
    }

    expect(actorsVisible(1)).toBe(false);
    expect(actorsVisible(1.54)).toBe(false);
    expect(actorsVisible(1.55)).toBe(true);
    expect(fireflyCount(20, 1)).toBe(4);
    expect(fireflyCount(20, 1.5)).toBe(12);
    expect(fireflyCount(20, 2)).toBe(20);
  });

  it('reduces zoomed-out water detail deterministically and restores it when zoomed in', () => {
    const tiles = Array.from({ length: 315 }, (_, index) => ({
      x: index % 80,
      y: Math.floor(index / 80),
    }));
    const aerialCount = tiles.filter(({ x, y }) => waterTileEffectVisible(x, y, 1)).length;
    const mediumCount = tiles.filter(({ x, y }) => waterTileEffectVisible(x, y, 2)).length;
    const closeCount = tiles.filter(({ x, y }) => waterTileEffectVisible(x, y, 2.25)).length;

    expect(aerialCount).toBeLessThan(mediumCount);
    expect(mediumCount).toBeLessThan(closeCount);
    expect(closeCount).toBe(tiles.length);
  });
});
