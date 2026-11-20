import { describe, expect, it } from 'vitest';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  cameraView,
  fitContain,
  initialCamera,
  panCameraBy,
  viewToContent,
  wheelDeltaToZoomFactor,
  zoomCameraAt,
} from './viewTransform';

describe('fitContain', () => {
  it('fits a wide window by height and centres the picture sideways', () => {
    // Picture 896 x 478; window 2000 x 478 is height-limited, so scale 1.
    const t = fitContain(2000, 478, 896, 478);
    expect(t.scale).toBe(1);
    expect(t.offsetX).toBe((2000 - 896) / 2);
    expect(t.offsetY).toBe(0);
  });

  it('fits a tall window by width and centres the picture vertically', () => {
    const t = fitContain(448, 2000, 896, 478);
    expect(t.scale).toBe(0.5);
    expect(t.offsetX).toBe(0);
    expect(t.offsetY).toBe((2000 - 478 * 0.5) / 2);
  });

  it('never stretches: one scale serves both directions, so the shape is kept', () => {
    for (const [w, h] of [
      [1920, 1080],
      [1280, 720],
      [390, 844],
      [844, 390],
      [3440, 1440],
    ] as const) {
      const t = fitContain(w, h, 896, 478);
      expect((896 * t.scale) / (478 * t.scale)).toBeCloseTo(896 / 478, 12);
    }
  });

  it('never makes the picture larger than the window in either direction', () => {
    for (const [w, h] of [
      [1920, 1080],
      [390, 844],
      [100, 100],
    ] as const) {
      const t = fitContain(w, h, 896, 478);
      expect(896 * t.scale).toBeLessThanOrEqual(w + 1e-9);
      expect(478 * t.scale).toBeLessThanOrEqual(h + 1e-9);
      // ...and touches the window on at least one axis.
      const fillsWidth = Math.abs(896 * t.scale - w) < 1e-9;
      const fillsHeight = Math.abs(478 * t.scale - h) < 1e-9;
      expect(fillsWidth || fillsHeight).toBe(true);
    }
  });

  it('scales up on a big window as well as down on a small one', () => {
    expect(fitContain(1792, 956, 896, 478).scale).toBe(2);
    expect(fitContain(448, 239, 896, 478).scale).toBe(0.5);
  });

  it('returns a zero-size result instead of NaN for a window or picture with no size', () => {
    expect(fitContain(0, 800, 896, 478)).toEqual({ scale: 0, offsetX: 0, offsetY: 0 });
    expect(fitContain(800, 600, 0, 478)).toEqual({ scale: 0, offsetX: 0, offsetY: 0 });
  });
});

describe('viewToContent', () => {
  it('maps the picture\'s corners back to its own pixel corners', () => {
    const t = fitContain(1600, 1000, 896, 478);
    const topLeft = viewToContent(t, t.offsetX, t.offsetY)!;
    expect(topLeft.x).toBeCloseTo(0, 9);
    expect(topLeft.y).toBeCloseTo(0, 9);
    const bottomRight = viewToContent(t, t.offsetX + 896 * t.scale, t.offsetY + 478 * t.scale)!;
    expect(bottomRight.x).toBeCloseTo(896, 9);
    expect(bottomRight.y).toBeCloseTo(478, 9);
  });

  it('undoes the forward mapping for any point', () => {
    const t = fitContain(1234, 777, 896, 478);
    const point = { x: 300.5, y: 120.25 };
    const onScreen = { x: point.x * t.scale + t.offsetX, y: point.y * t.scale + t.offsetY };
    const back = viewToContent(t, onScreen.x, onScreen.y)!;
    expect(back.x).toBeCloseTo(point.x, 9);
    expect(back.y).toBeCloseTo(point.y, 9);
  });

  it('gives points in the sky margin coordinates outside the picture', () => {
    const t = fitContain(2000, 478, 896, 478);
    expect(viewToContent(t, 5, 100)!.x).toBeLessThan(0);
  });

  it('returns null when nothing is drawn', () => {
    expect(viewToContent({ scale: 0, offsetX: 0, offsetY: 0 }, 10, 10)).toBeNull();
  });
});

describe('camera zoom', () => {
  const contentWidth = 400;
  const contentHeight = 200;
  const viewWidth = 1000;
  const viewHeight = 700;
  const fit = fitContain(viewWidth, viewHeight, contentWidth, contentHeight);

  it('zooms in and out without changing the initial framing', () => {
    const initial = initialCamera(contentWidth, contentHeight);
    expect(cameraView(fit, viewWidth, viewHeight, initial)).toEqual(fit);

    const zoomedIn = zoomCameraAt(
      initial, fit, viewWidth, viewHeight, contentWidth, contentHeight, 300, 260, 1.5,
    );
    expect(zoomedIn.zoom).toBe(1.5);

    const zoomedOut = zoomCameraAt(
      zoomedIn, fit, viewWidth, viewHeight, contentWidth, contentHeight, 300, 260, 1 / 1.5,
    );
    expect(zoomedOut).toEqual(initial);
  });

  it('keeps the picture point beneath the cursor stationary while zooming', () => {
    const initial = initialCamera(contentWidth, contentHeight);
    const cursor = { x: 300, y: 260 };
    const before = cameraView(fit, viewWidth, viewHeight, initial);
    const picturePoint = viewToContent(before, cursor.x, cursor.y)!;
    const zoomed = zoomCameraAt(
      initial,
      fit,
      viewWidth,
      viewHeight,
      contentWidth,
      contentHeight,
      cursor.x,
      cursor.y,
      1.8,
    );
    const after = cameraView(fit, viewWidth, viewHeight, zoomed);

    expect(viewToContent(after, cursor.x, cursor.y)).toEqual(picturePoint);
  });

  it('clamps at minimum and maximum zoom and restores the whole-town framing at minimum', () => {
    const initial = initialCamera(contentWidth, contentHeight);
    const maxed = zoomCameraAt(
      initial, fit, viewWidth, viewHeight, contentWidth, contentHeight, 100, 100, 100,
    );
    expect(maxed.zoom).toBe(MAX_ZOOM);

    const mined = zoomCameraAt(
      maxed, fit, viewWidth, viewHeight, contentWidth, contentHeight, 900, 600, 0.001,
    );
    expect(mined).toEqual({ ...initial, zoom: MIN_ZOOM });
    expect(cameraView(fit, viewWidth, viewHeight, mined)).toEqual(fit);
  });

  it('preserves zoom and the world-space viewport centre after resizing', () => {
    const zoomed = zoomCameraAt(
      initialCamera(contentWidth, contentHeight),
      fit,
      viewWidth,
      viewHeight,
      contentWidth,
      contentHeight,
      300,
      260,
      1.75,
    );
    const resizedFit = fitContain(800, 500, contentWidth, contentHeight);
    const resizedView = cameraView(resizedFit, 800, 500, zoomed);

    expect(resizedView.scale / resizedFit.scale).toBe(zoomed.zoom);
    expect(viewToContent(resizedView, 400, 250)).toEqual({
      x: zoomed.centerX,
      y: zoomed.centerY,
    });
  });

  it('normalizes wheel units, ignores invalid input, and caps extreme deltas', () => {
    expect(wheelDeltaToZoomFactor(10, 0, 800)).toBeLessThan(1);
    expect(wheelDeltaToZoomFactor(-1, 1, 800)).toBeGreaterThan(1);
    expect(wheelDeltaToZoomFactor(1, 2, 800)).toBeLessThan(1);
    expect(wheelDeltaToZoomFactor(0, 0, 800)).toBeNull();
    expect(wheelDeltaToZoomFactor(Number.NaN, 0, 800)).toBeNull();
    expect(wheelDeltaToZoomFactor(Number.POSITIVE_INFINITY, 0, 800)).toBeNull();
    expect(wheelDeltaToZoomFactor(1, 3, 800)).toBeNull();
    expect(wheelDeltaToZoomFactor(1e100, 0, 800)).toBeCloseTo(Math.exp(-0.36));
  });
});

describe('camera panning', () => {
  const contentWidth = 400;
  const contentHeight = 200;
  const viewWidth = 1000;
  const viewHeight = 700;
  const fit = fitContain(viewWidth, viewHeight, contentWidth, contentHeight);

  it('moves the camera with the pointer in all four directions', () => {
    const camera = initialCamera(contentWidth, contentHeight);
    const startView = cameraView(fit, viewWidth, viewHeight, camera);
    for (const [deltaX, deltaY] of [
      [20, 0],
      [-20, 0],
      [0, 20],
      [0, -20],
    ] as const) {
      const moved = panCameraBy(camera, fit, deltaX, deltaY);
      const movedView = cameraView(fit, viewWidth, viewHeight, moved);
      expect(movedView.offsetX).toBeCloseTo(startView.offsetX + deltaX);
      expect(movedView.offsetY).toBeCloseTo(startView.offsetY + deltaY);
    }
  });

  it('uses the active zoom scale and preserves zoom for each pan', () => {
    for (const zoom of [1, 2, MAX_ZOOM]) {
      const camera = { ...initialCamera(contentWidth, contentHeight), zoom };
      const start = cameraView(fit, viewWidth, viewHeight, camera);
      const moved = panCameraBy(camera, fit, 24, -12);
      const after = cameraView(fit, viewWidth, viewHeight, moved);

      expect(moved.zoom).toBe(zoom);
      expect(after.offsetX).toBeCloseTo(start.offsetX + 24);
      expect(after.offsetY).toBeCloseTo(start.offsetY - 12);
    }
  });

  it('keeps cursor-focused zoom working after a pan', () => {
    const panned = panCameraBy(initialCamera(contentWidth, contentHeight), fit, 40, -25);
    const cursor = { x: 350, y: 240 };
    const before = cameraView(fit, viewWidth, viewHeight, panned);
    const focus = viewToContent(before, cursor.x, cursor.y)!;
    const zoomed = zoomCameraAt(
      panned,
      fit,
      viewWidth,
      viewHeight,
      contentWidth,
      contentHeight,
      cursor.x,
      cursor.y,
      1.6,
    );

    expect(viewToContent(cameraView(fit, viewWidth, viewHeight, zoomed), cursor.x, cursor.y))
      .toEqual(focus);
  });
});

describe('fitContain for the whole town picture', () => {
  // 2240 wide by about 1200 tall; exact size is whatever worldBounds says.
  const contentW = 2240;
  const contentH = 1200;

  it('keeps proportions at any window shape: one scale, content never exceeds the window', () => {
    for (const [w, h] of [[1440, 900], [390, 844], [844, 390], [3440, 1440], [500, 500]] as const) {
      const v = fitContain(w, h, contentW, contentH);
      expect(contentW * v.scale).toBeLessThanOrEqual(w + 1e-9);
      expect(contentH * v.scale).toBeLessThanOrEqual(h + 1e-9);
      // At least one dimension fills the window exactly (it is "contain", not "shrink").
      const fills = Math.abs(contentW * v.scale - w) < 1e-9 || Math.abs(contentH * v.scale - h) < 1e-9;
      expect(fills).toBe(true);
    }
  });

  it('centres the picture', () => {
    const v = fitContain(1000, 1000, contentW, contentH);
    expect(v.offsetX).toBeCloseTo((1000 - contentW * v.scale) / 2, 9);
    expect(v.offsetY).toBeCloseTo((1000 - contentH * v.scale) / 2, 9);
  });
});
