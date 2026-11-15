// The theme registry: every colour the site uses lives here, by name.
//
// Components never contain colour values. Sprites and UI refer to colours by
// name, and those names become CSS custom properties (--c-grass, --c-ink, ...)
// on the <html> element. A new theme is therefore a new palette object, not a
// change to any component. Switching themes later means calling applyTheme()
// with a different one.
//
// Keeping the values in TypeScript, rather than only in CSS, lets a test check
// that text and focus colours have enough contrast (see themes.test.ts).

// Colours used to draw the scene. Sprites refer to these names.
export const SCENE_COLORS = [
  'skyTop',
  'skyMid',
  'skyLow',
  'cloud',
  'cloudShade',
  'hillFar',
  'hillNear',
  'grass',
  'grassLight',
  'grassDark',
  'path',
  'pathEdge',
  'trunk',
  'leaf',
  'leafLight',
  'leafDark',
  'wood',
  'woodDark',
  'roof',
  'roofDark',
  'wall',
  'wallShade',
  'glass',
  'stone',
  'flowerPink',
  'flowerYellow',
  'flowerWhite',
  'mail',
  'mailFlag',
  'outline',
] as const;

// Colours used by the interface around and on top of the scene.
export const UI_COLORS = [
  'ink', // main text
  'inkMuted', // secondary text
  'paper', // panel and page background
  'paperShade', // subtle second surface
  'border', // panel and button borders
  'accent', // primary button background
  'accentInk', // text on the accent colour
  'plank', // wooden label background used on the scene
  'plankInk', // text on a plank
  'focus', // keyboard focus ring
] as const;

export type SceneColor = (typeof SCENE_COLORS)[number];
export type UiColor = (typeof UI_COLORS)[number];
export type ColorName = SceneColor | UiColor;

export interface Theme {
  id: ThemeId;
  name: string;
  colors: Record<ColorName, string>;
}

// Add an id here, and an entry in `themes` below, to add a theme. TypeScript
// then insists the new palette defines every colour.
export type ThemeId = 'daytime-meadow';

const daytimeMeadow: Theme = {
  id: 'daytime-meadow',
  name: 'Daytime Meadow',
  colors: {
    // Scene
    skyTop: '#6ec6f2',
    skyMid: '#8fd5f5',
    skyLow: '#b9e6f8',
    cloud: '#ffffff',
    cloudShade: '#dcecf6',
    hillFar: '#8cc99a',
    hillNear: '#5fae6b',
    grass: '#6fbf5a',
    grassLight: '#8fd46f',
    grassDark: '#4f9a45',
    path: '#e8cf9a',
    pathEdge: '#c9a96c',
    trunk: '#7a5230',
    leaf: '#3f8f4a',
    leafLight: '#5bb061',
    leafDark: '#2d6e3a',
    wood: '#b9824b',
    woodDark: '#8a5a30',
    roof: '#c4553d',
    roofDark: '#9b3f2d',
    wall: '#f3e3bd',
    wallShade: '#d9c496',
    glass: '#7cc4e8',
    stone: '#9a9aa6',
    flowerPink: '#f78fb3',
    flowerYellow: '#ffd23f',
    flowerWhite: '#ffffff',
    mail: '#d64545',
    mailFlag: '#ffd23f',
    outline: '#3b2f2a',
    // Interface
    ink: '#2b2a33',
    inkMuted: '#58525c',
    paper: '#fff8e7',
    paperShade: '#f3e8cc',
    border: '#3b2f2a',
    accent: '#2c6e49',
    accentInk: '#ffffff',
    plank: '#f2cf8a',
    plankInk: '#2b2a33',
    focus: '#14229c',
  },
};

export const themes: Record<ThemeId, Theme> = {
  'daytime-meadow': daytimeMeadow,
};

export const defaultTheme: Theme = daytimeMeadow;

// "skyTop" -> "--c-sky-top". CSS custom properties are case-sensitive and
// conventionally kebab-case.
function cssVariableName(color: ColorName): string {
  return '--c-' + color.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
}

// The value to put in a fill or background: "var(--c-sky-top)". Components use
// this instead of a colour value, so the active theme decides the colour.
export function colorVar(color: ColorName): string {
  return `var(${cssVariableName(color)})`;
}

// The theme as a plain { "--c-sky-top": "#6ec6f2", ... } map. Pure, so it can
// be tested without a browser.
export function themeVariables(theme: Theme): Record<string, string> {
  const variables: Record<string, string> = {};
  for (const name of [...SCENE_COLORS, ...UI_COLORS]) {
    variables[cssVariableName(name)] = theme.colors[name];
  }
  return variables;
}

// Writes the theme onto an element (in practice <html>). main.tsx calls this
// before React renders, so the first paint already has the right colours.
// data-theme is there for CSS that needs to vary per theme beyond colours.
export function applyTheme(root: HTMLElement, theme: Theme): void {
  root.dataset.theme = theme.id;
  for (const [name, value] of Object.entries(themeVariables(theme))) {
    root.style.setProperty(name, value);
  }
}
