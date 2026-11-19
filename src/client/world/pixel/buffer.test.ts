import { describe, expect, it } from 'vitest';
import { PixelBuffer, channels, hex, mixRgba, rgba } from './buffer';
import { hash2, pick, rng } from './random';

describe('colours', () => {
  it('packs and unpacks channels', () => {
    expect(channels(rgba(10, 20, 30, 255))).toEqual([10, 20, 30, 255]);
    expect(channels(hex('#ff8000'))).toEqual([255, 128, 0, 255]);
  });
  it('refuses anything that is not #rrggbb', () => {
    expect(() => hex('red')).toThrow('#rrggbb');
  });
  it('mixes', () => {
    expect(mixRgba(hex('#000000'), hex('#ffffff'), 0)).toBe(hex('#000000'));
    expect(mixRgba(hex('#000000'), hex('#ffffff'), 1)).toBe(hex('#ffffff'));
  });
});

describe('PixelBuffer', () => {
  const red = hex('#ff0000');
  const blue = hex('#0000ff');

  it('starts transparent and ignores writes outside itself', () => {
    const b = new PixelBuffer(4, 4);
    expect(b.get(1, 1)).toBe(0);
    b.set(-1, 0, red);
    b.set(4, 0, red);
    expect(b.data.every((v) => v === 0)).toBe(true);
  });

  it('fills a rectangle exactly', () => {
    const b = new PixelBuffer(6, 6);
    b.fillRect(1, 2, 3, 2, red);
    expect(b.data.filter((v) => v === red)).toHaveLength(6);
    expect(b.get(1, 2)).toBe(red);
    expect(b.get(3, 3)).toBe(red);
    expect(b.get(4, 3)).toBe(0);
  });

  it('fills a polygon with no gap or overlap between neighbours that share an edge', () => {
    const b = new PixelBuffer(40, 20);
    const left = [{ x: 2, y: 2 }, { x: 20.3, y: 2 }, { x: 14.7, y: 17 }, { x: 2, y: 17 }];
    const right = [{ x: 20.3, y: 2 }, { x: 38, y: 2 }, { x: 38, y: 17 }, { x: 14.7, y: 17 }];
    b.fillPolygon(left, red);
    b.fillPolygon(right, blue);
    for (let y = 2; y < 17; y++) {
      for (let x = 2; x < 38; x++) expect(b.get(x, y), `${x},${y}`).not.toBe(0);
    }
    // And the red polygon never spilled onto the right one's pixels.
    const redCount = b.data.filter((v) => v === red).length;
    const blueCount = b.data.filter((v) => v === blue).length;
    expect(redCount + blueCount).toBe((38 - 2) * (17 - 2));
  });

  it('draws a line including both ends', () => {
    const b = new PixelBuffer(10, 10);
    b.line(1, 1, 8, 4, red);
    expect(b.get(1, 1)).toBe(red);
    expect(b.get(8, 4)).toBe(red);
  });

  it('accepts a shader function', () => {
    const b = new PixelBuffer(4, 1);
    b.fillRect(0, 0, 4, 1, (x) => (x % 2 ? red : blue));
    expect([b.get(0, 0), b.get(1, 0)]).toEqual([blue, red]);
  });

  it('outlines only outside the shape', () => {
    const sprite = new PixelBuffer(3, 3);
    sprite.fillRect(1, 1, 1, 1, red);
    const out = new PixelBuffer(5, 5);
    out.outlineOf(sprite, 1, 1, blue);
    expect(out.data.filter((v) => v === blue)).toHaveLength(4);
    expect(out.get(2, 2)).toBe(0); // the shape's own pixel is not outlined
  });

  it('blends toward a colour without touching transparent pixels', () => {
    const b = new PixelBuffer(2, 1);
    b.set(0, 0, hex('#ffffff'));
    b.blend(0, 0, hex('#000000'), 0.5);
    b.blend(1, 0, hex('#000000'), 0.5);
    expect(channels(b.get(0, 0))[0]).toBe(128);
    expect(b.get(1, 0)).toBe(0);
  });
});

describe('random', () => {
  it('is repeatable and within 0..1', () => {
    expect(hash2(3, 4, 5)).toBe(hash2(3, 4, 5));
    for (let i = 0; i < 100; i++) {
      const v = hash2(i, i * 7, 1);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('differs by coordinate and seed', () => {
    expect(hash2(1, 2, 0)).not.toBe(hash2(2, 1, 0));
    expect(hash2(1, 2, 0)).not.toBe(hash2(1, 2, 1));
  });
  it('generates a repeatable sequence', () => {
    const a = rng(42);
    const b = rng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('picks within range', () => {
    expect(pick(['a', 'b', 'c'], 0)).toBe('a');
    expect(pick(['a', 'b', 'c'], 0.999)).toBe('c');
  });
});
