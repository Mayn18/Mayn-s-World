// The terrain model: everything the renderer needs to know about the ground,
// worked out once from the raw Terrain.
//
// Terrain (data/) says what is at each tile. The model adds what follows from it:
// how high each surface really is, how far water is from shore, what each step
// between heights is made of, and in what order to draw. Keeping this apart from
// drawing means it can be tested without a canvas, and the painter stays a simple
// loop over the model.
import type { Terrain, TileCoord } from '../data/types';
import { backToFront } from '../render/depth';
import { type TerrainEdge, type TerrainFace, findEdges } from './edges';
import { shoreDistance } from './shore';

// A water surface sits a little below the ground at the same level, so a riverbank
// has a visible lip and water reads as lower than the land. 0.4 level = 4 px.
export const WATER_DROP_LEVELS = 0.4;

// The map is drawn as a solid block. Its south and east sides are cut faces that
// reach this many levels below the lowest ground (level 0).
export const SKIRT_LEVELS = 2;

export interface TileFaces {
  south: TerrainFace | null;
  east: TerrainFace | null;
}

export interface TerrainModel {
  terrain: Terrain;
  // Height of each tile's top surface in levels, indexed [y][x].
  surface: number[][];
  // Distance from land for water tiles (0 for land), indexed [y][x].
  shore: number[][];
  // Every step between neighbouring heights, once each.
  edges: TerrainEdge[];
  // The faces a viewer can see, for each tile, indexed [y][x].
  faces: TileFaces[][];
  // Every tile in drawing order, far to near.
  order: TileCoord[];
}

export function buildTerrainModel(terrain: Terrain): TerrainModel {
  const { width, height, levels, water } = terrain;

  const surface = levels.map((row, y) =>
    row.map((level, x) => (water[y]![x]! ? level - WATER_DROP_LEVELS : level)),
  );

  const edges = findEdges(terrain, surface);

  const faces: TileFaces[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ south: null, east: null })),
  );

  // A viewer in the south-east sees only the south and east sides of a tile, so
  // only steps leading south or east from the higher tile become faces. A step
  // leading north or west is hidden behind the higher tile.
  for (const edge of edges) {
    const face: TerrainFace = { kind: edge.kind, top: edge.top, bottom: edge.bottom };
    if (edge.direction === 'S') faces[edge.high.y]![edge.high.x]!.south = face;
    if (edge.direction === 'E') faces[edge.high.y]![edge.high.x]!.east = face;
  }

  // The cut sides of the map block on the south and east edges.
  for (let x = 0; x < width; x++) {
    faces[height - 1]![x]!.south = skirtFace(terrain, surface, x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    faces[y]![width - 1]!.east = skirtFace(terrain, surface, width - 1, y);
  }

  const order = backToFront(
    levels.flatMap((row, y) => row.map((_, x) => ({ x, y }))),
  );

  return { terrain, surface, shore: shoreDistance(terrain), edges, faces, order };
}

function skirtFace(terrain: Terrain, surface: number[][], x: number, y: number): TerrainFace {
  return {
    kind: terrain.water[y]![x]! ? 'waterSkirt' : 'skirt',
    top: surface[y]![x]!,
    bottom: -SKIRT_LEVELS,
  };
}
