import { describe, expect, it, vi } from 'vitest';
import { fitContain, initialCamera, panCameraBy, cameraView } from './viewTransform';
import { setWorldTransform } from './worldTransform';

describe('world layer transform', () => {
  it('keeps the animation overlay aligned with the cached world while panning and zooming', () => {
    for (const [width, height] of [[390, 844], [844, 390], [820, 1180], [1440, 900]] as const) {
      const fit = fitContain(width, height, 2240, 1200);
      let camera = { ...initialCamera(2240, 1200), zoom: 2.4 };
      camera = panCameraBy(camera, fit, 47, -23);
      const view = cameraView(fit, width, height, camera);
      const makeContext = () => ({
        setTransform: vi.fn(),
        translate: vi.fn(),
      });
      const cachedWorld = makeContext();
      const overlay = makeContext();
      const bounds = { left: -48, top: -91 };

      setWorldTransform(cachedWorld, view, 2, bounds);
      setWorldTransform(overlay, view, 2, bounds);

      expect(overlay.setTransform.mock.calls).toEqual(cachedWorld.setTransform.mock.calls);
      expect(overlay.translate.mock.calls).toEqual(cachedWorld.translate.mock.calls);
    }
  });
});
