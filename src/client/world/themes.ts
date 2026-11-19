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

// A ramp is one material in four shades, darkest first. Pixel art shades a
// surface with a few fixed steps rather than blending: the lit side of a wall
// uses a light step, the shaded side a dark one, and texture picks neighbours.
// Light comes from the upper left, so south-west faces use the lighter steps and
// south-east faces the darker ones.
export type Ramp = readonly [string, string, string, string];

export const RAMP_NAMES = [
  // ground
  'pave', 'dirt', 'plank', 'stone', 'rock', 'water', 'wheat', 'hay',
  // walls
  'plaster', 'cream', 'brick', 'timber',
  // roofs
  'roofRed', 'roofBrown', 'roofSlate', 'roofBlue', 'roofGreen', 'roofTeal', 'roofOrange', 'roofThatch',
  // plants
  'leaf', 'leafYellow', 'pine', 'trunk',
  // small things
  'iron', 'glass', 'gold', 'skin',
] as const;
export type RampName = (typeof RAMP_NAMES)[number];

export interface Theme {
  id: ThemeId;
  name: string;
  colors: Record<ColorName, string>;
  // Materials for the pixel-art town (roads, buildings, plants, people).
  ramps: Record<RampName, Ramp>;
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
  ramps: {
    pave: ['#9a8a66', '#b5a47c', '#cdbd96', '#e0d3b0'],
    dirt: ['#a07c4c', '#b9945f', '#cfab74', '#e2c590'],
    plank: ['#5e3f22', '#80572f', '#a3733d', '#c28f52'],
    stone: ['#6f6a85', '#8d889f', '#aaa6b9', '#c9c6d4'],
    rock: ['#5f5f6e', '#7c7c8a', '#9a9aa6', '#b8b8c2'],
    water: ['#3f8fc0', '#5aaad6', '#7cc4e8', '#b4e0f4'],
    wheat: ['#b88a1f', '#d4a62c', '#eac24a', '#f6dc7a'],
    hay: ['#a67c2a', '#c89c3a', '#e0b955', '#f2d27a'],
    plaster: ['#a9a7b3', '#c8c6d0', '#e2e0e8', '#f4f3f8'],
    cream: ['#b8a47a', '#d3c196', '#e8d9b0', '#f6ecca'],
    brick: ['#7c3b2c', '#9d4b37', '#bb5f45', '#d27a58'],
    timber: ['#3a2618', '#52361f', '#6d4a2b', '#8a6439'],
    roofRed: ['#7e2f22', '#a2402d', '#c4553d', '#dd7050'],
    roofBrown: ['#4c2d1d', '#6a4129', '#85552f', '#a26e42'],
    roofSlate: ['#2e3040', '#41445a', '#5a5e78', '#767b96'],
    roofBlue: ['#2f4a73', '#3f6396', '#5481b8', '#74a2d2'],
    roofGreen: ['#2c5a46', '#3a7459', '#4d9171', '#6cae8d'],
    roofTeal: ['#2a5f66', '#37787f', '#4b969c', '#6bb3b6'],
    roofOrange: ['#a1481f', '#c35f28', '#e07a35', '#f09a55'],
    roofThatch: ['#8a6a2c', '#a98539', '#c9a24c', '#e2bf6a'],
    leaf: ['#1f5a35', '#2d7a40', '#43a04c', '#6dc060'],
    leafYellow: ['#5d7a22', '#86a233', '#b0c446', '#d4de6c'],
    pine: ['#16452d', '#1f5c3b', '#2b7a4a', '#3e9a5c'],
    trunk: ['#4a3020', '#654229', '#82592f', '#a07440'],
    iron: ['#1d1a24', '#2a2633', '#3b3646', '#55505f'],
    glass: ['#27405a', '#3b6a94', '#6aa5cc', '#a7d6ec'],
    gold: ['#a5801f', '#c8a02c', '#e8c040', '#f8dc70'],
    skin: ['#a56a47', '#c98a5e', '#e3ad80', '#f4cfa4'],
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
