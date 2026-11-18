// The colours the terrain painter uses, worked out from the active theme.
//
// A canvas cannot read CSS variables (fillStyle does not understand
// "var(--c-grass)"), so the painter is given plain colour strings. They come from
// the Theme object, the same single source that sets the CSS variables, so the
// canvas and the rest of the page always agree, and no colour value is written
// in this file.
import type { Theme } from '../themes';

export interface TerrainPalette {
  // Top surface colour for each elevation level, index 0 = lowest.
  top: readonly string[];
  water: string;
  // Cliff faces. Light comes from the upper left, so the face turned towards
  // the south-west (the left face on screen) is lit and the face turned towards
  // the south-east (the right face) is in shade.
  faceLit: string;
  faceShade: string;
}

// Levels in layout.json go up to 5.
const LEVEL_COUNT = 6;

function parseHex(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`Expected a #rrggbb colour, got "${hex}"`);
  const value = parseInt(match[1]!, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

// Blends two colours. t = 0 gives a, t = 1 gives b, 0.5 is halfway.
export function mix(a: string, b: string, t: number): string {
  const from = parseHex(a);
  const to = parseHex(b);
  const channels = from.map((start, i) => Math.round(start + (to[i]! - start) * t));
  return '#' + channels.map((c) => c.toString(16).padStart(2, '0')).join('');
}

export function terrainPalette(theme: Theme): TerrainPalette {
  const { grassDark, grassLight, glass, stone, outline } = theme.colors;
  // Higher ground gets steadily lighter, so the height of the land can be read
  // from colour alone, not only from the cliff faces.
  const top = Array.from({ length: LEVEL_COUNT }, (_, level) =>
    mix(grassDark, grassLight, level / (LEVEL_COUNT - 1)),
  );
  return {
    top,
    water: glass,
    faceLit: stone,
    faceShade: mix(stone, outline, 0.4),
  };
}
