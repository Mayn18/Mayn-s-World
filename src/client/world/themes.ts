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
  'focusContrast', // contrasting outer edge for the focus ring
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
  keyLight: {
    kind: 'sun' | 'moon' | 'diffuse' | 'filtered';
    color: string;
    intensity: number;
    elevationDeg: number;
  };
  shadow: {
    color: string;
    opacity: number;
    lengthScale: number;
    edgeSteps: 1 | 2;
  };
  surface: {
    wetness: number;
    snowCover: number;
    puddleDensity: number;
  };
  water: {
    frozen: boolean;
    reflection: string;
    reflectionStrength: number;
  };
  emissive: {
    windowColor: string;
    windowFraction: number;
    lampColor: string;
    poolStrength: number;
    poolRadius: number;
  };
  accent: {
    color: string;
    strength: number;
  };
}

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
    focusContrast: '#ffffff',
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
  keyLight: { kind: 'sun', color: '#ffffff', intensity: 1, elevationDeg: 50 },
  surface: { wetness: 0, snowCover: 0, puddleDensity: 0 },
  water: { frozen: false, reflection: '#ffffff', reflectionStrength: 0 },
  emissive: {
    windowColor: '#ffffff',
    windowFraction: 0,
    lampColor: '#ffd23f',
    poolStrength: 0,
    poolRadius: 0.45,
  },
  accent: { color: '#ffffff', strength: 0 },
};

function themed(
  id: ThemeId,
  name: string,
  colors: Partial<Record<ColorName, string>>,
  materials: Partial<Record<MaterialName, string>>,
  options: Partial<Omit<Theme, 'id' | 'name' | 'colors' | 'materials'>>,
): Theme {
  return {
    ...daytimeMeadow,
    ...options,
    id,
    name,
    colors: { ...daytimeMeadow.colors, ...colors },
    materials: { ...daytimeMeadow.materials, ...materials },
    keyLight: { ...daytimeMeadow.keyLight, ...options.keyLight },
    shadow: { ...daytimeMeadow.shadow, ...options.shadow },
    surface: { ...daytimeMeadow.surface, ...options.surface },
    water: { ...daytimeMeadow.water, ...options.water },
    emissive: { ...daytimeMeadow.emissive, ...options.emissive },
    accent: { ...daytimeMeadow.accent, ...options.accent },
  };
}

const sunsetDream = themed(
  'sunset-dream',
  'Sunset Dream',
  {
    skyTop: '#3b2a6e', skyMid: '#d9638c', skyLow: '#ffb066',
    cloud: '#ffe2c3', cloudShade: '#d694a5',
    hillFar: '#8b7669', hillNear: '#788354',
    grass: '#71834b', grassLight: '#b7a05f', grassDark: '#4d6247',
    path: '#c99578', pathEdge: '#a9766e',
    leaf: '#57824b', leafLight: '#9e9a59', leafDark: '#355744',
    roof: '#c66a50', roofDark: '#874d5a',
    wall: '#f2d2ae', wallShade: '#bf9b8e',
    glass: '#8c6f98', stone: '#9b8c89',
    flowerYellow: '#ffd27a', flowerWhite: '#ffe5cc',
    outline: '#463850',
    ink: '#35283b', inkMuted: '#5d4a59', paper: '#fff2df',
    paperShade: '#f4d2c2', border: '#4d304f', accent: '#92466b',
    accentInk: '#ffffff', plank: '#f5bb82', plankInk: '#3d2945',
    focus: '#17164e',
    focusContrast: '#ffffff',
  },
  {
    wallCream: '#e8c8a9', wallSand: '#cfaa8f', wallPlaster: '#d4a58c',
    wallBrick: '#a95850', wallStone: '#9b8c89', wallWhite: '#f5e1c7',
    wallBlue: '#9b91a2', wallTimber: '#59434b',
    roofRed: '#b95e50', roofBrown: '#765044', roofSlate: '#55516c',
    roofBlue: '#56546b', roofGreen: '#66745d', roofTeal: '#66745d',
    roofOrange: '#c0784c', roofThatch: '#c19a5b', roofDark: '#3d3856',
    awnRed: '#a95850', awnGreen: '#66745d', awnBlue: '#56546b',
    awnYellow: '#d7b87f', gold: '#e0b56d',
  },
  {
    keyLight: { kind: 'sun', color: '#ffb27a', intensity: 1.1, elevationDeg: 14 },
    shadow: { color: '#3b2060', opacity: 0.45, lengthScale: 1.35, edgeSteps: 2 },
    emissive: { windowColor: '#ffd09a', windowFraction: 0.08, lampColor: '#ffbf73', poolStrength: 0.08, poolRadius: 0.4 },
  },
);

const cozyNight = themed(
  'cozy-night',
  'Cozy Night',
  {
    skyTop: '#0e1530', skyMid: '#182448', skyLow: '#25335e',
    cloud: '#858fae', cloudShade: '#505b7b',
    hillFar: '#40505b', hillNear: '#405b51',
    grass: '#3b5943', grassLight: '#66805a', grassDark: '#283e39',
    path: '#827a7b', pathEdge: '#5e5c70',
    trunk: '#705447', leaf: '#426c4d', leafLight: '#73945f', leafDark: '#253c36',
    wood: '#806b58', woodDark: '#50454b',
    roof: '#77556c', roofDark: '#51415d',
    wall: '#b7ad9a', wallShade: '#77788a',
    glass: '#637eb0', stone: '#8c91a0',
    flowerPink: '#d88fa9', flowerYellow: '#e7bf68', flowerWhite: '#e6dfd0',
    mail: '#ba5c69', mailFlag: '#e7bf68', outline: '#202944',
    ink: '#f3f1e8', inkMuted: '#c7c9d4', paper: '#202a45',
    paperShade: '#2b3857', border: '#0b1328', accent: '#86b8a2',
    accentInk: '#14223a', plank: '#5c5267', plankInk: '#fff4dd',
    focus: '#8b83a6',
    focusContrast: '#ffffff',
  },
  {
    wallCream: '#aaa28f', wallSand: '#8e897f', wallPlaster: '#97939a',
    wallBrick: '#875c5b', wallStone: '#7f8797', wallWhite: '#c6c3b9',
    wallBlue: '#6f7d99', wallTimber: '#4e4d59',
    roofRed: '#87585c', roofBrown: '#5d4a48', roofSlate: '#485778',
    roofBlue: '#43516d', roofGreen: '#466951', roofTeal: '#426c68',
    roofOrange: '#9a684f', roofThatch: '#958052', roofDark: '#303b5a',
    awnRed: '#87585c', awnGreen: '#466951', awnBlue: '#43516d',
    awnYellow: '#9b8b65', doorWood: '#604d4b', iron: '#38445f', gold: '#b69b63',
  },
  {
    keyLight: { kind: 'moon', color: '#9fb4e8', intensity: 0.65, elevationDeg: 45 },
    shadow: { color: '#0a0f28', opacity: 0.35, lengthScale: 1, edgeSteps: 2 },
    emissive: { windowColor: '#ffc46b', windowFraction: 0.6, lampColor: '#ffc46b', poolStrength: 0.56, poolRadius: 0.62 },
  },
);

const rainyEvening = themed(
  'rainy-evening',
  'Rainy Evening',
  {
    skyTop: '#6d7b8c', skyMid: '#8795a4', skyLow: '#a3adb8',
    cloud: '#c0c8ce', cloudShade: '#8c98a5',
    hillFar: '#818c89', hillNear: '#737f78',
    grass: '#65796c', grassLight: '#8a9a82', grassDark: '#52665e',
    path: '#8c9295', pathEdge: '#68767c',
    trunk: '#6f625b', leaf: '#5e7865', leafLight: '#84977b', leafDark: '#485f59',
    wood: '#887d70', woodDark: '#615b5a',
    roof: '#7f7474', roofDark: '#5e626a',
    wall: '#d0c9bd', wallShade: '#a5a7a5',
    glass: '#7898aa', stone: '#989d9f',
    flowerPink: '#c68b9e', flowerYellow: '#d5bd79', flowerWhite: '#e5e5df',
    mail: '#b66060', mailFlag: '#d5bd79', outline: '#3c4753',
    ink: '#25313d', inkMuted: '#4b5964', paper: '#eef1f1',
    paperShade: '#dce3e6', border: '#394752', accent: '#38656d',
    accentInk: '#ffffff', plank: '#c1cdd0', plankInk: '#293941',
    focus: '#253c70',
    focusContrast: '#ffffff',
  },
  {
    wallCream: '#c6c0b4', wallSand: '#aaa69e', wallPlaster: '#b7b6b2',
    wallBrick: '#9d6861', wallStone: '#92999c', wallWhite: '#dadbd7',
    wallBlue: '#8f9ca3', wallTimber: '#555a5a',
    roofRed: '#9b655e', roofBrown: '#695b54', roofSlate: '#596879',
    roofBlue: '#526778', roofGreen: '#5d776e', roofTeal: '#52777b',
    roofOrange: '#a2765c', roofThatch: '#a0906a', roofDark: '#3e4b59',
    awnRed: '#9d6861', awnGreen: '#5d776e', awnBlue: '#526778',
    awnYellow: '#b7a78a', doorWood: '#6d5f57', iron: '#46545d', gold: '#b8a681',
  },
  {
    keyLight: { kind: 'diffuse', color: '#b6c1cf', intensity: 0.6, elevationDeg: 45 },
    shadow: { color: '#2a3140', opacity: 0.1, lengthScale: 0.55, edgeSteps: 1 },
    surface: { wetness: 0.8, snowCover: 0, puddleDensity: 0.065 },
    emissive: { windowColor: '#ffc46b', windowFraction: 0.16, lampColor: '#ffc46b', poolStrength: 0.18, poolRadius: 0.48 },
  },
);

const enchantedForest = themed(
  'enchanted-forest',
  'Enchanted Forest',
  {
    skyTop: '#0f3d44', skyMid: '#23645d', skyLow: '#56a07c',
    cloud: '#b5dfc0', cloudShade: '#6f9e89',
    hillFar: '#386d58', hillNear: '#3c7653',
    grass: '#3f7950', grassLight: '#76a968', grassDark: '#285e49',
    path: '#9d9b70', pathEdge: '#777b61',
    trunk: '#694d3c', leaf: '#34774f', leafLight: '#76b66e', leafDark: '#1e5543',
    wood: '#80654b', woodDark: '#4b4439',
    roof: '#547b69', roofDark: '#34584f',
    wall: '#d2d7b4', wallShade: '#a1b99d',
    glass: '#70c8ad', stone: '#929d8a',
    flowerPink: '#d28ea9', flowerYellow: '#c9d77a', flowerWhite: '#d5efd1',
    mail: '#b8656e', mailFlag: '#c9d77a', outline: '#173f3d',
    ink: '#edf5df', inkMuted: '#c0d4c2', paper: '#1e4b46',
    paperShade: '#2a5b52', border: '#123732', accent: '#a9d77c',
    accentInk: '#173a34', plank: '#497663', plankInk: '#eff6d8',
    focus: '#0b2720',
    focusContrast: '#ffffff',
  },
  {
    wallCream: '#c8cba8', wallSand: '#a9b48e', wallPlaster: '#b8c49b',
    wallBrick: '#9c6257', wallStone: '#8f9d8b', wallWhite: '#d9dfc0',
    wallBlue: '#8aa99c', wallTimber: '#4d5543',
    roofRed: '#a25d53', roofBrown: '#69513e', roofSlate: '#4b6570',
    roofBlue: '#456b70', roofGreen: '#4b795f', roofTeal: '#438075',
    roofOrange: '#ad7650', roofThatch: '#a99a59', roofDark: '#294b4e',
    awnRed: '#9c6257', awnGreen: '#4b795f', awnBlue: '#456b70',
    awnYellow: '#c0bd7d', doorWood: '#68523d', iron: '#385b56', gold: '#c6ce75',
  },
  {
    keyLight: { kind: 'filtered', color: '#b8ffd9', intensity: 0.6, elevationDeg: 40 },
    shadow: { color: '#0a2a33', opacity: 0.4, lengthScale: 0.85, edgeSteps: 2 },
    emissive: { windowColor: '#a9ecc8', windowFraction: 0.12, lampColor: '#d1df8b', poolStrength: 0.12, poolRadius: 0.45 },
    accent: { color: '#c4ec85', strength: 0.2 },
  },
);

const snowyCabin = themed(
  'snowy-cabin',
  'Snowy Cabin',
  {
    skyTop: '#b9c9dc', skyMid: '#d9e3ed', skyLow: '#eef3f8',
    cloud: '#ffffff', cloudShade: '#dbe5ed',
    hillFar: '#a6b8bf', hillNear: '#91aaa2',
    grass: '#8fae9c', grassLight: '#cad9d0', grassDark: '#729183',
    path: '#9a8d7f', pathEdge: '#716f6d',
    trunk: '#735947', leaf: '#63856c', leafLight: '#a0b99b', leafDark: '#49695f',
    wood: '#9a8067', woodDark: '#68564d',
    roof: '#6f8191', roofDark: '#505f72',
    wall: '#e8e5dd', wallShade: '#b6c2c8',
    glass: '#7394ac', stone: '#a0a9ab',
    flowerPink: '#d493a8', flowerYellow: '#d7ba70', flowerWhite: '#ffffff',
    mail: '#bd5d5a', mailFlag: '#e0bd68', outline: '#39495b',
    ink: '#253442', inkMuted: '#4b5c69', paper: '#f4f7f8',
    paperShade: '#e0e9ee', border: '#425566', accent: '#406b79',
    accentInk: '#ffffff', plank: '#d6e0e5', plankInk: '#283b49',
    focus: '#243c75',
    focusContrast: '#ffffff',
  },
  {
    wallCream: '#d6d4cb', wallSand: '#c1c4bd', wallPlaster: '#c7d0cf',
    wallBrick: '#a86c62', wallStone: '#9da9ad', wallWhite: '#f1f0eb',
    wallBlue: '#9bb0bb', wallTimber: '#5c554e',
    roofRed: '#a45e54', roofBrown: '#705744', roofSlate: '#536c83',
    roofBlue: '#4e687e', roofGreen: '#5c7c6f', roofTeal: '#4e7e80',
    roofOrange: '#ad7550', roofThatch: '#a9905e', roofDark: '#3c4d62',
    awnRed: '#a86c62', awnGreen: '#5c7c6f', awnBlue: '#4e687e',
    awnYellow: '#c3b387', doorWood: '#715744', iron: '#485b69', gold: '#c6ad72',
  },
  {
    keyLight: { kind: 'sun', color: '#e8f0ff', intensity: 0.7, elevationDeg: 25 },
    shadow: { color: '#5a6fa0', opacity: 0.3, lengthScale: 0.72, edgeSteps: 2 },
    surface: { wetness: 0, snowCover: 0.9, puddleDensity: 0 },
    water: { frozen: true, reflection: '#eaf3ff', reflectionStrength: 0.35 },
    emissive: { windowColor: '#ffc46b', windowFraction: 0.4, lampColor: '#ffc46b', poolStrength: 0.3, poolRadius: 0.52 },
  },
);

export const themes: Record<ThemeId, Theme> = {
  'daytime-meadow': daytimeMeadow,
  'sunset-dream': sunsetDream,
  'cozy-night': cozyNight,
  'rainy-evening': rainyEvening,
  'snowy-cabin': snowyCabin,
  'enchanted-forest': enchantedForest,
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
