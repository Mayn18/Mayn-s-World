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

// Colours for buildings: wall and roof materials and a few accents. Each is ONE
// base colour; the painters derive lit, shaded and dark variants for their
// authored pixel-art details.
export const MATERIAL_NAMES = [
  // walls
  'wallCream', 'wallSand', 'wallPlaster', 'wallBrick', 'wallStone', 'wallWhite', 'wallBlue', 'wallTimber',
  // roofs
  'roofRed', 'roofBrown', 'roofSlate', 'roofBlue', 'roofGreen', 'roofTeal', 'roofOrange', 'roofThatch', 'roofDark',
  // awnings, doors and trim
  'awnRed', 'awnGreen', 'awnBlue', 'awnYellow', 'doorWood', 'iron', 'gold',
] as const;
export type MaterialName = (typeof MATERIAL_NAMES)[number];

export interface Theme {
  id: ThemeId;
  name: string;
  colors: Record<ColorName, string>;
  materials: Record<MaterialName, string>;
  shadow: {
    color: string;
    opacity: number;
    lengthScale: number;
    edgeSteps: 1 | 2;
  };
}

// `ThemeId` declares the identifiers reserved for the six planned themes.
// `themes` is currently a partial registry containing only implemented palettes.
// When a new palette is added, its entry must define every existing colour.
export type ThemeId =
  | 'daytime-meadow'
  | 'cozy-night'
  | 'rainy-evening'
  | 'sunset-dream'
  | 'enchanted-forest'
  | 'snowy-cabin';

const daytimeMeadow: Theme = {
  id: 'daytime-meadow',
  name: 'Daytime Meadow',
  colors: {
    // Scene
    skyTop: '#8fc8ee',
    skyMid: '#c8e7f4',
    skyLow: '#dff0fb',
    cloud: '#ffffff',
    cloudShade: '#dcecf6',
    hillFar: '#94b963',
    hillNear: '#66a954',
    grass: '#6fae4a',
    grassLight: '#97cb62',
    grassDark: '#4a8a4a',
    path: '#c8b98f',
    pathEdge: '#a99f86',
    trunk: '#7a4f33',
    leaf: '#4f9145',
    leafLight: '#80c05a',
    leafDark: '#1d5238',
    wood: '#a58762',
    woodDark: '#7a4f33',
    roof: '#c0613f',
    roofDark: '#b4533a',
    wall: '#f4e7cc',
    wallShade: '#d2c5a8',
    glass: '#6fc0e2',
    stone: '#a39e9a',
    flowerPink: '#f78fb3',
    flowerYellow: '#ffd23f',
    flowerWhite: '#ffffff',
    mail: '#d64545',
    mailFlag: '#ffd23f',
    outline: '#414357',
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
    focus: '#10186f',
  },
  materials: {
    wallCream: '#e6d9b8',
    wallSand: '#cbb994',
    wallPlaster: '#d0bf98',
    wallBrick: '#b4533a',
    wallStone: '#a39e9a',
    wallWhite: '#f4ecd8',
    wallBlue: '#9fb0ba',
    wallTimber: '#5a4a40',
    // Terracotta roofs sit about 15% below the old flat saturation, so they stay
    // warm without becoming the loudest thing in the scene.
    roofRed: '#b66649',
    roofBrown: '#7a4f33',
    roofSlate: '#4f5873',
    roofBlue: '#4d5666',
    roofGreen: '#4a7f6a',
    roofTeal: '#4a7f6a',
    roofOrange: '#be7749',
    roofThatch: '#b8964f',
    roofDark: '#363d57',
    awnRed: '#b4533a',
    awnGreen: '#4a7f6a',
    awnBlue: '#4d5666',
    awnYellow: '#d8c69e',
    doorWood: '#7a4f33',
    iron: '#414357',
    gold: '#cdb98f',
  },
  shadow: {
    color: '#3a3d6a',
    opacity: 0.34,
    lengthScale: 0.85,
    edgeSteps: 2,
  },
};

export const themes: Partial<Record<ThemeId, Theme>> = {
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
