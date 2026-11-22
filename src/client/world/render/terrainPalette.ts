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

// Colours for streets, lanes, tracks, the square, ramps, stairs and bridges.
// Material detail is derived from these theme colours by the corresponding painters.
export interface RoadColours {
  // The top of each kind of paving. Lightest to darkest: square, streets, lanes,
  // footpaths and narrow farm tracks.
  surface: Record<'plaza' | 'plazaEdge' | 'main' | 'lane' | 'path' | 'track', string>;
  // A thin darker line along the edge of paved ground where it meets grass.
  kerb: string;
  // A road climbing a bank: lit on a south face, shaded on an east face. `line` is
  // the edge between the ramp and the wall or bank beside it.
  rampPaved: FaceColours;
  rampEarth: FaceColours;
  // A flight of stairs; `line` is the lit edge of each tread.
  stairs: FaceColours;
  // Bridges and piers: the deck, its rail along open sides, and the side that
  // hangs down to the water.
  timber: { deck: string; rail: string; face: FaceColours };
  stone: { deck: string; rail: string; face: FaceColours };
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
  roads: RoadColours;
}

// Levels in layout.json go up to 5.
// Colours exist for levels 0 to 5 as approved at Milestone 2, plus the castle hill's higher
// levels, which continue the same ramp towards the wall colour. Missing entries would leave
// the canvas fill unchanged and show whatever was drawn last.
const BASE_LEVELS = 6;
const LEVEL_COUNT = 8;
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
  const top = Array.from({ length: LEVEL_COUNT }, (_, level) => {
    const ground = mix(lowest, highest, Math.min(level, BASE_LEVELS - 1) / (BASE_LEVELS - 1));
    return level < BASE_LEVELS ? ground : mix(ground, c.wall, 0.1 * (level - BASE_LEVELS + 1));
  });

  // Pale at the shore, deeper towards the middle of the river.
  const shallow = mix(c.glass, c.cloud, 0.3);
  const deep = mix(c.glass, c.outline, 0.22);
  const water = Array.from({ length: WATER_STEPS }, (_, i) =>
    mix(shallow, deep, i / (WATER_STEPS - 1)),
  );

  const castleBase = mix(c.stone, c.wall, 0.4);

  // Paving runs from pale stone (the square) to packed earth (tracks), all in the
  // warm family of the theme's path colours so it reads as one restrained set.
  const main = mix(c.path, c.wall, 0.5);
  const lane = mix(c.path, c.pathEdge, 0.4);
  const path = mix(c.pathEdge, c.wood, 0.25);
  const track = mix(path, c.woodDark, 0.2);
  const kerb = mix(c.pathEdge, c.outline, 0.25);
  const ramp = (base: string): FaceColours => ({
    lit: mix(base, c.outline, 0.1),
    shade: mix(base, c.outline, 0.3),
    line: kerb,
  });
  const stairBase = mix(c.stone, c.wall, 0.55);
  const timberBase = mix(c.wood, c.path, 0.25);
  const stoneBridge = material(mix(c.stone, c.wall, 0.4), c.outline);

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
    roads: {
      surface: {
        plaza: mix(c.wall, c.cloud, 0.2),
        plazaEdge: mix(mix(c.wall, c.cloud, 0.2), lane, 0.16),
        main,
        lane,
        path,
        track,
      },
      kerb,
      rampPaved: ramp(main),
      rampEarth: ramp(path),
      stairs: {
        lit: stairBase,
        shade: mix(stairBase, c.outline, 0.3),
        line: mix(stairBase, c.cloud, 0.55),
      },
      timber: {
        deck: timberBase,
        rail: c.woodDark,
        face: material(mix(c.wood, c.woodDark, 0.5), c.outline),
      },
      stone: { deck: main, rail: c.stone, face: stoneBridge },
    },
  };
}
