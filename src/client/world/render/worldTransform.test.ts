import { describe, expect, it } from 'vitest';
import { townModel } from '../terrain/town';
import { pickTile } from './picking';
import { tileCenter } from './projection';
import { worldBounds } from './bounds';
import { cameraView, fitContain, initialCamera, panCameraBy } from './viewTransform';
import { setPictureTransform, setWorldTransform } from './worldTransform';

function transformContext() {
  let matrix = [1, 0, 0, 1, 0, 0];
  return {
    setTransform(a: number, b: number, c: number, d: number, e: number, f: number) {
      matrix = [a, b, c, d, e, f];
    },
    translate(x: number, y: number) {
      const [a, b, c, d, e, f] = matrix;
      matrix = [a, b, c, d, e + a * x + c * y, f + b * x + d * y];
    },
    point(x: number, y: number) {
      const [a, b, c, d, e, f] = matrix;
      return { x: a * x + c * y + e, y: b * x + d * y + f };
    },
  };
}

describe('world layer transforms', () => {
  it('aligns a known cached tile, ambient point, and pointer hit after camera and DPR transforms', () => {
    const bounds = worldBounds(townModel);
    const tile = { x: 79, y: 59 };
    const worldPoint = tileCenter(tile, townModel.surface[tile.y]![tile.x]!);
    const picturePoint = { x: worldPoint.sx - bounds.left, y: worldPoint.sy - bounds.top };

    for (const [width, height, dpr] of [[1440, 900, 2], [844, 390, 1]] as const) {
      const fit = fitContain(width, height, bounds.width, bounds.height);
      const camera = panCameraBy(
        { ...initialCamera(bounds.width, bounds.height), zoom: 1.2 },
        fit,
        2,
        -2,
      );
      const view = cameraView(fit, width, height, camera);
      const cachedWorld = transformContext();
      const overlay = transformContext();

      setPictureTransform(cachedWorld, view, dpr);
      setWorldTransform(overlay, view, dpr, bounds);

      const expected = {
        x: picturePoint.x * view.scale + view.offsetX,
        y: picturePoint.y * view.scale + view.offsetY,
      };
      const cachedScreen = cachedWorld.point(picturePoint.x, picturePoint.y);
      const overlayScreen = overlay.point(worldPoint.sx, worldPoint.sy);
      expect(cachedScreen.x / dpr).toBeCloseTo(expected.x, 8);
      expect(cachedScreen.y / dpr).toBeCloseTo(expected.y, 8);
      expect(overlayScreen.x / dpr).toBeCloseTo(expected.x, 8);
      expect(overlayScreen.y / dpr).toBeCloseTo(expected.y, 8);

      const pictureUnderPointer = {
        x: (expected.x - view.offsetX) / view.scale,
        y: (expected.y - view.offsetY) / view.scale,
      };
      const picked = pickTile(
        townModel,
        pictureUnderPointer.x + bounds.left,
        pictureUnderPointer.y + bounds.top,
      );
      expect(picked).toMatchObject(tile);
    }
  });
});
