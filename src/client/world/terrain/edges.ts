// Terrain boundaries: where the ground steps from one height to another, and what
// that step is made of.
//
// layout.json gives the height of every tile but not what the step between two
// tiles is. It only says, in total, "152 slopes, 96 castle, 56 cliffs, 133 walls,
// 4 banks" (`level_edges`), with no locations. So the material of each step is
// DERIVED here, from rules that use only data in the file. These are the rules,
// in the order they are applied to a step between a higher tile and a lower one:
//
//   1. Water involved      -> "cascade" if the higher tile is water (water above
//                             lower ground), otherwise "bank" (land above water).
//   2. Drop of 2+ levels   -> "cliff": bare rock.
//   3. Drop of 1, and either tile is level 4 or higher
//                          -> "castle": the masonry base of the castle hill.
//   4. Drop of 1 along a continuous straight run: if at least half of the run lies
//      beside developed ground (a road, lane, path or pier within one tile of the
//      step), the whole run is a "wall": a built retaining wall. Streets and
//      terraces are held up with masonry. The exception is a tile where a road
//      itself climbs (a ramp or stairs, across the road's whole width, see
//      roads/crossings.ts): there the ground is a slope, so the wall is broken
//      by the ramp.
//   5. Any other drop of 1 -> "slope": a grass bank on open ground.
//
// Deciding per RUN, not per tile, keeps one terrace edge one material. Deciding
// tile by tile gave a dashed wall/grass/wall pattern along a single straight step.
//
// HOW THIS COMPARES WITH THE FILE'S TOTALS (checked in edges.test.ts)
//   castle: 96 here, 96 in the file (exact)
//   slope + wall: 285 here, 285 in the file (exact); the split is 166 / 119 here,
//                 152 / 133 in the file, so rule 4 is an approximation
//   bank: 4 steps between land and water of different heights, 4 in the file (exact)
//   cliff: 56 here, 56 in the file (exact)
// Rule 4 is a judgement, not a fact from the file. It is isolated in one small
// function (`markRetainingWalls`) so it can be changed without touching anything
// else.
import type { Terrain, TileCoord } from '../data/types';
import { findCrossingSteps } from '../roads/crossings';

export type EdgeKind = 'slope' | 'wall' | 'cliff' | 'castle' | 'bank' | 'cascade';
// "skirt" faces are the cut sides of the map block itself (south and east map
// edges), not steps between tiles.
export type FaceKind = EdgeKind | 'skirt' | 'waterSkirt';
export type Direction = 'N' | 'E' | 'S' | 'W';

// A step from a higher tile down to its lower neighbour. `top` and `bottom` are
// surface heights in levels (water surfaces sit a little below their level, so
// these can be fractions).
export interface TerrainEdge {
  high: TileCoord;
  low: TileCoord;
  // Which way you walk from the high tile to reach the low one.
  direction: Direction;
  kind: EdgeKind;
  top: number;
  bottom: number;
}

// The vertical face a viewer can see, hanging from a tile's south or east side.
export interface TerrainFace {
  kind: FaceKind;
  top: number;
  bottom: number;
}

const STEP: Record<Direction, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 },
};

// Tiles within one tile (including diagonally) of a road, path or pier.
export function nearRoadTiles(terrain: Terrain): boolean[][] {
  const { width, height, roads } = terrain;
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (roads[y + dy]?.[x + dx]) return true;
        }
      }
      return false;
    }),
  );
}

// The steps where a road climbs by ramp or stairs, as "x,y>direction" keys.
export function climbingSteps(terrain: Terrain): Set<string> {
  return new Set(
    findCrossingSteps(terrain).map((s) => `${s.high.x},${s.high.y}>${s.direction}`),
  );
}

// Rule 4 above. `edges` are all the steps; this changes the kind of the plain
// one-level land steps ("slope" so far) that belong to a mostly-developed run to
// "wall". `developed(edge)` says whether a step lies beside developed ground.
const WALL_SHARE = 0.5;

function markRetainingWalls(edges: TerrainEdge[], nearRoad: boolean[][], climbing: Set<string>) {
  const isPlainStep = (e: TerrainEdge) => e.kind === 'slope';
  const developed = (e: TerrainEdge) => nearRoad[e.high.y]![e.high.x]! || nearRoad[e.low.y]![e.low.x]!;
  const climbs = (e: TerrainEdge) => climbing.has(`${e.high.x},${e.high.y}>${e.direction}`);

  // A run is a row of steps that face the same way, have the same height pair and
  // lie along one straight line. Group by that line, then split at gaps.
  const lines = new Map<string, { along: number; edge: TerrainEdge }[]>();
  for (const edge of edges.filter(isPlainStep)) {
    const vertical = edge.direction === 'E' || edge.direction === 'W';
    const across = vertical ? edge.high.x : edge.high.y;
    const along = vertical ? edge.high.y : edge.high.x;
    const key = `${edge.direction}:${across}:${edge.top}`;
    const line = lines.get(key) ?? [];
    line.push({ along, edge });
    lines.set(key, line);
  }

  for (const line of lines.values()) {
    line.sort((a, b) => a.along - b.along);
    let run: TerrainEdge[] = [];
    let previous = -Infinity;
    const finish = () => {
      if (run.length > 0 && run.filter(developed).length / run.length >= WALL_SHARE) {
        for (const edge of run) if (!climbs(edge)) edge.kind = 'wall';
      }
      run = [];
    };
    for (const { along, edge } of line) {
      if (along !== previous + 1) finish();
      run.push(edge);
      previous = along;
    }
    finish();
  }
}

// Every step in the map, once each, from the higher tile down to the lower. A step
// is any pair of neighbouring tiles whose SURFACES differ in height. `surface[y][x]`
// is the tile's surface height in levels (see model.ts for why water differs).
export function findEdges(terrain: Terrain, surface: number[][]): TerrainEdge[] {
  const edges: TerrainEdge[] = [];

  for (let y = 0; y < terrain.height; y++) {
    for (let x = 0; x < terrain.width; x++) {
      for (const direction of ['N', 'E', 'S', 'W'] as const) {
        const nx = x + STEP[direction].dx;
        const ny = y + STEP[direction].dy;
        if (nx < 0 || ny < 0 || nx >= terrain.width || ny >= terrain.height) continue;

        const top = surface[y]![x]!;
        const bottom = surface[ny]![nx]!;
        // Only record a step from its HIGHER side, so each step appears once.
        if (!(top > bottom + 1e-9)) continue;

        const highWater = terrain.water[y]![x]!;
        const lowWater = terrain.water[ny]![nx]!;
        const drop = terrain.levels[y]![x]! - terrain.levels[ny]![nx]!;

        let kind: EdgeKind;
        if (highWater || lowWater) kind = highWater ? 'cascade' : 'bank';
        else if (drop >= 2) kind = 'cliff';
        else if (Math.max(terrain.levels[y]![x]!, terrain.levels[ny]![nx]!) >= 4) kind = 'castle';
        else kind = 'slope'; // provisional: markRetainingWalls may make it a wall

        edges.push({ high: { x, y }, low: { x: nx, y: ny }, direction, kind, top, bottom });
      }
    }
  }

  markRetainingWalls(edges, nearRoadTiles(terrain), climbingSteps(terrain));
  return edges;
}
