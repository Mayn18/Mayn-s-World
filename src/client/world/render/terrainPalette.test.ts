import { describe, expect, it } from 'vitest';
import { defaultTheme } from '../themes';
import { WATER_STEPS, mix, terrainPalette } from './terrainPalette';

describe('mix', () => {
  it('returns the first colour at 0 and the second at 1', () => {
    expect(mix('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff');
  });

  it('returns the midpoint at 0.5', () => {
    expect(mix('#000000', '#fefefe', 0.5)).toBe('#7f7f7f');
  });

  it('refuses anything that is not #rrggbb', () => {
    expect(() => mix('red', '#ffffff', 0.5)).toThrow('#rrggbb');
  });
});

function brightness(hex: string): number {
  const v = parseInt(hex.slice(1), 16);
  return ((v >> 16) & 255) * 0.299 + ((v >> 8) & 255) * 0.587 + (v & 255) * 0.114;
}

describe('terrainPalette', () => {
  const palette = terrainPalette(defaultTheme);

  it('has a top colour for each of the six levels', () => {
    expect(palette.top).toHaveLength(6);
  });

  it('gives every level its own colour, and higher ground is never darker', () => {
    expect(new Set(palette.top).size).toBe(6);
    for (let level = 1; level < 6; level++) {
      expect(brightness(palette.top[level]!)).toBeGreaterThan(brightness(palette.top[level - 1]!));
    }
  });

  it('lights every material from the upper left: south face lit, east face darker', () => {
    for (const [kind, colours] of Object.entries(palette.faces)) {
      expect(brightness(colours.shade), kind).toBeLessThan(brightness(colours.lit));
    }
  });

  it('has a colour set for every kind of face', () => {
    expect(Object.keys(palette.faces).sort()).toEqual(
      ['bank', 'cascade', 'castle', 'cliff', 'skirt', 'slope', 'wall', 'waterSkirt'].sort(),
    );
  });

  it('makes water deeper (darker) away from the shore', () => {
    expect(palette.water).toHaveLength(WATER_STEPS);
    for (let i = 1; i < palette.water.length; i++) {
      expect(brightness(palette.water[i]!)).toBeLessThan(brightness(palette.water[i - 1]!));
    }
  });

  it('only contains #rrggbb colours', () => {
    const all = [...palette.top, ...palette.water, palette.waterShore, palette.wallCap,
      ...Object.values(palette.faces).flatMap((f) => [f.lit, f.shade, f.line])];
    for (const colour of all) expect(colour).toMatch(/^#[0-9a-f]{6}$/);
  });
});
