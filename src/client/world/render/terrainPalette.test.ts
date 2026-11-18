import { describe, expect, it } from 'vitest';
import { defaultTheme } from '../themes';
import { mix, terrainPalette } from './terrainPalette';

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

describe('terrainPalette', () => {
  const palette = terrainPalette(defaultTheme);

  it('has a top colour for each of the six levels', () => {
    expect(palette.top).toHaveLength(6);
  });

  it('runs from the theme darkest grass at level 0 to its lightest at level 5', () => {
    expect(palette.top[0]).toBe(defaultTheme.colors.grassDark);
    expect(palette.top[5]).toBe(defaultTheme.colors.grassLight);
  });

  it('gives every level its own colour, so height reads without the cliffs', () => {
    expect(new Set(palette.top).size).toBe(6);
  });

  it('shades the east-facing cliff darker than the lit one', () => {
    expect(palette.faceShade).not.toBe(palette.faceLit);
  });
});
