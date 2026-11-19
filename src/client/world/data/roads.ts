// Works out which tiles a road covers.
//
// In layout.json a road is a centre line plus a width, for example
//   { name: "Cottage Road", width: 3, points: [[0, 30.5], [33, 30.5]] }
// meaning "a strip 3 tiles wide centred on y = 30.5, from x = 0 to x = 33".
// The strip covers every tile it overlaps: from y = 30.5 - 1.5 = 29 up to
// y = 32, so rows 29, 30 and 31. Rasterising means turning that continuous
// strip into a grid of yes/no tiles, which is what the rest of the code uses.
//
// Only straight horizontal or vertical segments occur in the file, so anything
// else is rejected instead of guessed at.
import type { RoadKind, RoadTile } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPoint(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  );
}

// Which road wins where two cross: the wider, more important one.
const PRIORITY: Record<RoadKind, number> = { main: 4, lane: 3, pier: 2, path: 1 };

function readKind(value: unknown, index: number): RoadKind {
  if (value === 'main' || value === 'lane' || value === 'path' || value === 'pier') return value;
  throw new Error(`layout.json: roads[${index}] "kind" must be main, lane, path or pier`);
}

// Same strips as rasterizeRoads, but each tile says what kind of road it is, which
// way it runs and what it is called, so the renderer can pave it and join
// stairs and ramps to it. Where roads cross, the more important one wins.
export function rasterizeRoadTiles(raw: unknown, width: number, height: number): (RoadTile | null)[][] {
  const tiles: (RoadTile | null)[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null),
  );
  if (!Array.isArray(raw)) {
    throw new Error('layout.json: "roads" must be a list');
  }

  raw.forEach((road: unknown, index) => {
    if (!isRecord(road) || typeof road.width !== 'number' || !(road.width > 0)) {
      throw new Error(`layout.json: roads[${index}] needs a positive "width"`);
    }
    const points = road.points;
    if (!Array.isArray(points) || points.length < 2 || !points.every(isPoint)) {
      throw new Error(`layout.json: roads[${index}] needs at least two [x, y] points`);
    }
    const half = road.width / 2;
    const kind = readKind(road.kind, index);
    const name = typeof road.name === 'string' ? road.name : `road ${index}`;

    for (let i = 0; i + 1 < points.length; i++) {
      const [x1, y1] = points[i] as [number, number];
      const [x2, y2] = points[i + 1] as [number, number];
      if (x1 !== x2 && y1 !== y2) {
        throw new Error(`layout.json: roads[${index}] has a diagonal segment`);
      }
      // Along the segment the strip runs from one end to the other; across it,
      // it spreads half its width to each side of the centre line.
      const xFrom = x1 === x2 ? x1 - half : Math.min(x1, x2);
      const xTo = x1 === x2 ? x1 + half : Math.max(x1, x2);
      const yFrom = y1 === y2 ? y1 - half : Math.min(y1, y2);
      const yTo = y1 === y2 ? y1 + half : Math.max(y1, y2);
      const axis: 'x' | 'y' = y1 === y2 ? 'x' : 'y';
      // A tile is covered if the strip overlaps it, clamped to the map.
      for (let y = Math.max(0, Math.floor(yFrom)); y < Math.min(height, Math.ceil(yTo)); y++) {
        for (let x = Math.max(0, Math.floor(xFrom)); x < Math.min(width, Math.ceil(xTo)); x++) {
          const existing = tiles[y]![x];
          if (!existing || PRIORITY[kind] > PRIORITY[existing.kind]) {
            tiles[y]![x] = { kind, axis, name };
          }
        }
      }
    }
  });
  return tiles;
}

export function rasterizeRoads(raw: unknown, width: number, height: number): boolean[][] {
  return rasterizeRoadTiles(raw, width, height).map((row) => row.map((tile) => tile !== null));
}
