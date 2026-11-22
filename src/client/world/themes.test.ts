import { describe, expect, it } from 'vitest';
import {
  MATERIAL_NAMES,
  SCENE_COLORS,
  UI_COLORS,
  defaultTheme,
  themeVariables,
  themes,
  type ColorName,
} from './themes';

// WCAG 2.x contrast ratio between two #rrggbb colours: (L1 + 0.05) / (L2 + 0.05)
// where L is relative luminance, so 1 means identical and 21 is black on white.
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

describe('theme registry', () => {
  it('registers every theme under its own id', () => {
    expect(Object.keys(themes).sort()).toEqual([
      'cozy-night',
      'daytime-meadow',
      'enchanted-forest',
      'rainy-evening',
      'snowy-cabin',
      'sunset-dream',
    ]);
    for (const [id, theme] of Object.entries(themes)) {
      expect(theme.id).toBe(id);
    }
  });

  it('gives every theme a valid #rrggbb value for every colour', () => {
    for (const theme of Object.values(themes)) {
      for (const name of [...SCENE_COLORS, ...UI_COLORS]) {
        expect(theme.colors[name], `${theme.id}.${name}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });
});

describe('building materials', () => {
  it('are valid #rrggbb colours in every theme', () => {
    for (const theme of Object.values(themes)) {
      for (const name of MATERIAL_NAMES) expect(theme.materials[name], `${theme.id}.${name}`).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('defines bounded painter parameters for lighting and surface states', () => {
    for (const theme of Object.values(themes)) {
      expect(theme.keyLight.intensity).toBeGreaterThanOrEqual(0);
      expect(theme.keyLight.intensity).toBeLessThanOrEqual(1.2);
      expect(theme.keyLight.elevationDeg).toBeGreaterThanOrEqual(0);
      expect(theme.keyLight.elevationDeg).toBeLessThanOrEqual(90);
      expect(theme.surface.wetness).toBeGreaterThanOrEqual(0);
      expect(theme.surface.wetness).toBeLessThanOrEqual(1);
      expect(theme.surface.snowCover).toBeGreaterThanOrEqual(0);
      expect(theme.surface.snowCover).toBeLessThanOrEqual(1);
      expect(theme.emissive.windowFraction).toBeGreaterThanOrEqual(0);
      expect(theme.emissive.windowFraction).toBeLessThanOrEqual(1);
    }
  });

  it('keeps the Daytime Meadow palette and shadow baseline unchanged', () => {
    expect(defaultTheme.colors).toMatchObject({
      skyTop: '#8fc8ee',
      skyMid: '#c8e7f4',
      skyLow: '#dff0fb',
      grass: '#6fae4a',
      outline: '#414357',
    });
    expect(defaultTheme.materials.roofRed).toBe('#b66649');
    expect(defaultTheme.shadow).toEqual({
      color: '#3a3d6a',
      opacity: 0.34,
      lengthScale: 0.85,
      edgeSteps: 2,
    });
  });
});

describe('themeVariables', () => {
  it('turns camelCase names into kebab-case CSS custom properties', () => {
    const variables = themeVariables(defaultTheme);
    expect(variables['--c-sky-top']).toBe(defaultTheme.colors.skyTop);
    expect(variables['--c-ink']).toBe(defaultTheme.colors.ink);
    expect(variables['--c-paper-shade']).toBe(defaultTheme.colors.paperShade);
  });

  it('defines one variable per colour and nothing else', () => {
    expect(Object.keys(themeVariables(defaultTheme))).toHaveLength(
      SCENE_COLORS.length + UI_COLORS.length,
    );
  });
});

// Every theme must meet these, so a new palette cannot quietly ship unreadable
// text. 4.5 is WCAG AA for normal text; 3 is AA for focus indicators and other
// non-text UI.
const registeredThemes = Object.values(themes).filter(
  (theme): theme is NonNullable<typeof theme> => theme !== undefined,
);

describe.each(registeredThemes)('contrast in $name', (theme) => {
  const c = (name: ColorName) => theme.colors[name];

  const textPairs: [ColorName, ColorName][] = [
    ['ink', 'paper'],
    ['ink', 'paperShade'],
    ['inkMuted', 'paper'],
    ['inkMuted', 'paperShade'],
    ['accentInk', 'accent'],
    ['plankInk', 'plank'],
  ];
  it.each(textPairs)('text %s on %s is at least 4.5:1', (foreground, background) => {
    expect(contrast(c(foreground), c(background))).toBeGreaterThanOrEqual(4.5);
  });

  // The focus ring is drawn outside the element with a gap (outline-offset in
  // styles.css), so it sits on the element's surroundings, never on the element
  // itself. That is why a button's own `accent` colour is not listed here. The
  // ring must stand out against everything it can surround.
  const focusBackgrounds: ColorName[] = [
    'paper',
    'paperShade',
    'plank',
    'grass',
    'grassLight',
    'grassDark',
    'skyTop',
    'skyMid',
    'skyLow',
    'hillFar',
    'hillNear',
    'path',
  ];
  it.each(focusBackgrounds)('two-tone focus ring on %s has a contrasting edge', (background) => {
    expect(Math.max(contrast(c('focus'), c(background)), contrast(c('focusContrast'), c(background))))
      .toBeGreaterThanOrEqual(3);
  });
});
