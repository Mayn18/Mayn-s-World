// The colours the terrain painters use, worked out from the active theme.
//
// A canvas cannot read CSS variables (fillStyle does not understand
// "var(--c-grass)"), so the painters are given plain colour strings. They come
// from the Theme object, the same single source that sets the CSS variables, so
// the canvas and the rest of the page always agree, and no colour value is
// written in this file.
//
// LIGHT comes from the upper left. On screen the face turned towards the lower
// left (a tile's south side) is lit, and the face turned towards the lower right
// (its east side) is in shade. Every material has a `lit` and a `shade` colour
// that follow this rule, so the lighting is consistent across the whole map.
import type { FaceKind } from '../terrain/edges';
import type { Theme } from '../themes';

export interface FaceColours {
  lit: string; // south-facing side
  shade: string; // east-facing side
  line: string; // masonry courses and rock strata drawn across the face
}

export interface TerrainPalette {
  // Top surface colour for each elevation level, index 0 = lowest.
  top: readonly string[];
  // Water top colour by distance from shore: index 0 is a tile touching land,
  // the last is open middle water.
  water: readonly string[];
  waterShore: string;
  wallCap: string;
  faces: Record<FaceKind, FaceColours>;
}

// Levels in layout.json go up to 5.
const LEVEL_COUNT = 6;
export const WATER_STEPS = 4;

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

// Builds the lit, shade and line colours of one material from its main colour.
function material(base: string, ink: string): FaceColours {
  return { lit: base, shade: mix(base, ink, 0.38), line: mix(base, ink, 0.22) };
}

export function terrainPalette(theme: Theme): TerrainPalette {
  const c = theme.colors;
  // Higher ground gets steadily lighter, so the height of the land can be read
  // from colour alone, not only from the cliff faces.
  // Lowland is a deeper, lusher green; the highest ground is paler and drier.
  const lowest = mix(c.grassDark, c.leafDark, 0.3);
  const highest = mix(c.grassLight, c.wall, 0.35);
  const top = Array.from({ length: LEVEL_COUNT }, (_, level) =>
    mix(lowest, highest, level / (LEVEL_COUNT - 1)),
  );

  // Pale at the shore, deeper towards the middle of the river.
  const shallow = mix(c.glass, c.cloud, 0.3);
  const deep = mix(c.glass, c.outline, 0.22);
  const water = Array.from({ length: WATER_STEPS }, (_, i) =>
    mix(shallow, deep, i / (WATER_STEPS - 1)),
  );

  const castleBase = mix(c.stone, c.wall, 0.4);
  return {
    top,
    water,
    waterShore: mix(c.glass, c.cloud, 0.75),
    wallCap: c.wall,
    faces: {
      // A grass bank: green, a little darker than the grass above it.
      slope: material(mix(c.grass, c.grassDark, 0.35), c.outline),
      // A built retaining wall: pale masonry.
      wall: material(c.wallShade, c.outline),
      // Bare rock.
      cliff: material(c.stone, c.outline),
      // The castle hill's foundation: warmer, lighter stone than natural rock.
      castle: material(castleBase, c.outline),
      // A riverbank: bare earth between the grass and the water.
      bank: material(c.pathEdge, c.outline),
      // Water spilling to lower water.
      cascade: material(mix(c.glass, c.cloud, 0.35), c.outline),
      // The cut sides of the map block: earth, and deep water where the river
      // meets the map edge.
      skirt: material(c.woodDark, c.outline),
      waterSkirt: material(mix(c.glass, c.outline, 0.3), c.outline),
    },
  };
}
