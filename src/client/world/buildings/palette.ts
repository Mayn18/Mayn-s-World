// Building colours, worked out from the theme.
//
// Each material in the theme is a single colour. A building needs four versions of
// it, all derived consistently so pixel highlights follow the town's lighting rule:
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
  // Colour and parameters of baked ground shadows (drawn semi-transparent).
  shadow: string;
  shadowOpacity: number;
  shadowEdgeSteps: 1 | 2;
  flowers: readonly string[];
  leaf: string;
  leafLight: string;
  leafDark: string;
  trunk: string;
  grassDark: string;
  wood: string;
  woodDark: string;
}

export type FormFace = 'top' | 'left' | 'right';

// One reusable, theme-neutral form-lighting rule. The theme supplies the material
// base and neutral ink/highlight colours; the face rule is fixed for every theme:
// top = highlight to light, left = light to base, right = shade. `exposure` lets a
// later theme soften the key light without flipping which face is brighter.
export function formTone(base: Tone, face: FormFace, exposure = 1): Tone {
  const e = Math.max(0, Math.min(1, exposure));
  // Exposure compresses the ramp towards its middle at 0 and gives the full
  // authored spread at 1, so a diffuse theme can soften the key without flipping it.
  const mid = mix(base.lit, base.shade, 0.5);
  const t = 0.5 + 0.5 * e;
  if (face === 'top') {
    return { lit: mix(mid, base.light, t), shade: mix(mid, base.lit, t), dark: base.dark, light: base.light };
  }
  if (face === 'left') {
    return { lit: mix(mid, base.lit, t), shade: mix(mid, base.shade, t), dark: base.dark, light: base.light };
  }
  return { lit: mix(mid, base.shade, t), shade: mix(mid, base.dark, t), dark: base.dark, light: base.light };
}

// Curved forms (tower drums, domes, canopies): three soft bands from the lit
// left side to the shaded right side. The middle band is a mix, never a new colour.
export function curvedTone(base: Tone): readonly [string, string, string] {
  return [
    base.light,
    mix(base.light, base.shade, 0.35),
    base.shade,
  ];
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
    shadow: theme.shadow.color,
    shadowOpacity: theme.shadow.opacity,
    shadowEdgeSteps: theme.shadow.edgeSteps,
    flowers: [c.flowerPink, c.flowerYellow, c.flowerWhite],
    leaf: c.leaf,
    leafLight: c.leafLight,
    leafDark: c.leafDark,
    trunk: c.trunk,
    grassDark: c.grassDark,
    wood: c.wood,
    woodDark: c.woodDark,
  };
}
