// The theme's colours turned into pixel values, once.
//
// Everything that draws the town reads colours from here, never from hex strings,
// so a new theme (night, snow) re-colours the whole town without touching a
// painter.
import { type Rgba, hex, mixRgba } from '../pixel/buffer';
import { terrainPalette } from '../render/terrainPalette';
import { type RampName, RAMP_NAMES, type Theme } from '../themes';

export interface Materials {
  // Four shades of each material, darkest first.
  ramp: Record<RampName, readonly Rgba[]>;
  // Four shades of grass for each elevation level, darkest first.
  grass: readonly (readonly Rgba[])[];
  outline: Rgba;
  white: Rgba;
}

export function buildMaterials(theme: Theme): Materials {
  const ramp = {} as Record<RampName, readonly Rgba[]>;
  for (const name of RAMP_NAMES) ramp[name] = theme.ramps[name].map(hex);

  const outline = hex(theme.colors.outline);
  const light = hex(theme.colors.grassLight);
  const grass = terrainPalette(theme).top.map((top) => {
    const base = hex(top);
    return [
      mixRgba(base, outline, 0.22),
      mixRgba(base, outline, 0.09),
      base,
      mixRgba(base, light, 0.45),
    ];
  });
  return { ramp, grass, outline, white: hex(theme.colors.flowerWhite) };
}
