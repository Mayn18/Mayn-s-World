// Building colours, worked out from the theme.
//
// Each material in the theme is a single colour. A building needs four versions of
// it, all derived the same way terrain materials are, so the town keeps one flat,
// restrained style and the lighting rule stays the same everywhere:
//   lit     the face turned to the upper-left light (south faces, south roof planes)
//   shade   the face turned away (east faces, east roof planes)
//   dark    lines and joints, and the underside of overhangs
//   light   a highlight: a ridge, a sill, the lit edge of a step
import { mix } from '../render/terrainPalette';
import { MATERIAL_NAMES, type MaterialName, type Theme } from '../themes';

export interface Tone {
  lit: string;
  shade: string;
  dark: string;
  light: string;
}

export interface BuildingPalette {
  m: Record<MaterialName, Tone>;
  glass: Tone;
  outline: string;
  white: string;
  // Colour of ground shadows (drawn semi-transparent).
  shadow: string;
  flowers: readonly string[];
  leaf: string;
}

function tone(base: string, ink: string, white: string): Tone {
  return {
    lit: base,
    shade: mix(base, ink, 0.32),
    dark: mix(base, ink, 0.52),
    light: mix(base, white, 0.34),
  };
}

export function buildingPalette(theme: Theme): BuildingPalette {
  const c = theme.colors;
  const m = {} as Record<MaterialName, Tone>;
  for (const name of MATERIAL_NAMES) m[name] = tone(theme.materials[name], c.outline, c.flowerWhite);
  const glassBase = mix(c.glass, c.wall, 0.08);
  return {
    m,
    glass: {
      lit: mix(glassBase, c.cloud, 0.1),
      shade: mix(glassBase, c.outline, 0.3),
      dark: mix(glassBase, c.outline, 0.55),
      light: mix(glassBase, c.flowerWhite, 0.6),
    },
    outline: c.outline,
    white: c.flowerWhite,
    shadow: c.outline,
    flowers: [c.flowerPink, c.flowerYellow, c.flowerWhite],
    leaf: c.leaf,
  };
}
