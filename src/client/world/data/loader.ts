// Turns the raw contents of layout.json into typed Terrain.
//
// Everything in a JSON file is "unknown" until checked: TypeScript cannot know
// what is in the file at run time. So parseTerrain() is the single door the data
// passes through, and it refuses anything that does not look right, with a
// message saying exactly where. That makes a damaged or hand-edited layout fail
// loudly at start-up instead of drawing a subtly wrong map.
//
// parseTerrain takes its input as an argument (instead of importing the file
// itself) so tests can feed it deliberately broken data.
import type { Crossing, CrossingKind, Terrain } from './types';
import { rasterizeRoadTiles } from './roads';
import layoutJson from './layout.json';
import { LEVEL_PX, TILE_H, TILE_W } from '../render/projection';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// A grid in layout.json is a list of strings, one per map row, one character
// per tile. Returns the characters as a list of lists, after checking the size.
function readGrid(
  raw: Record<string, unknown>,
  key: string,
  width: number,
  height: number,
): string[][] {
  const rows = raw[key];
  if (!Array.isArray(rows)) {
    throw new Error(`layout.json: "${key}" must be a list of row strings`);
  }
  if (rows.length !== height) {
    throw new Error(`layout.json: "${key}" has ${rows.length} rows, expected ${height}`);
  }
  return rows.map((row: unknown, y) => {
    if (typeof row !== 'string') {
      throw new Error(`layout.json: "${key}" row ${y} is not a string`);
    }
    if (row.length !== width) {
      throw new Error(
        `layout.json: "${key}" row ${y} is ${row.length} wide, expected ${width}`,
      );
    }
    return [...row];
  });
}

function positiveInteger(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`layout.json: ${what} must be a positive whole number`);
  }
  return value;
}

const CROSSING_KINDS: readonly string[] = ['ramp', 'stairs', 'bridge'];

function readCrossings(raw: Record<string, unknown>, width: number, height: number): Crossing[] {
  const list = raw.connections;
  if (!Array.isArray(list)) {
    throw new Error('layout.json: "connections" must be a list');
  }
  return list.map((entry: unknown, index) => {
    if (!isRecord(entry)) {
      throw new Error(`layout.json: connections[${index}] must be an object`);
    }
    const { road, kind, x, y } = entry;
    if (typeof road !== 'string' || typeof kind !== 'string' || !CROSSING_KINDS.includes(kind)) {
      throw new Error(`layout.json: connections[${index}] needs a road name and a kind of ramp, stairs or bridge`);
    }
    if (
      typeof x !== 'number' || typeof y !== 'number' ||
      !Number.isInteger(x) || !Number.isInteger(y) ||
      x < 0 || x >= width || y < 0 || y >= height
    ) {
      throw new Error(`layout.json: connections[${index}] is outside the ${width} x ${height} map`);
    }
    return { road, kind: kind as CrossingKind, x, y };
  });
}

export function parseTerrain(raw: unknown): Terrain {
  if (!isRecord(raw) || !isRecord(raw.grid)) {
    throw new Error('layout.json: missing "grid" section');
  }
  const { grid } = raw;
  const width = positiveInteger(grid.width, 'grid.width');
  const height = positiveInteger(grid.height, 'grid.height');

  // The renderer's projection uses fixed tile proportions. If the file claims
  // different ones, drawing it would silently be wrong, so refuse.
  const tile = grid.tile_px_iso;
  if (!Array.isArray(tile) || tile[0] !== TILE_W || tile[1] !== TILE_H) {
    throw new Error(`layout.json: grid.tile_px_iso must be [${TILE_W}, ${TILE_H}]`);
  }
  if (grid.level_px !== LEVEL_PX) {
    throw new Error(`layout.json: grid.level_px must be ${LEVEL_PX}`);
  }

  const levels = readGrid(raw, 'heights', width, height).map((row, y) =>
    row.map((char, x) => {
      // One digit per tile: "0" to "9".
      if (!/^[0-9]$/.test(char)) {
        throw new Error(`layout.json: heights (${x}, ${y}) is "${char}", expected a digit`);
      }
      return Number(char);
    }),
  );

  const water = readGrid(raw, 'water', width, height).map((row, y) =>
    row.map((char, x) => {
      if (char !== '0' && char !== '1') {
        throw new Error(`layout.json: water (${x}, ${y}) is "${char}", expected 0 or 1`);
      }
      return char === '1';
    }),
  );

  const roadTiles = rasterizeRoadTiles(raw.roads, width, height);
  const roads = roadTiles.map((row) => row.map((tile) => tile !== null));
  const crossings = readCrossings(raw, width, height);

  return { width, height, levels, water, roads, crossings, roadTiles };
}

// The town's terrain, read once when this module is first imported.
export const townTerrain: Terrain = parseTerrain(layoutJson);
