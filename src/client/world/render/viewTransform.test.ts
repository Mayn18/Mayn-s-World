import { describe, expect, it } from 'vitest';
import { fitContain, viewToContent } from './viewTransform';

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
