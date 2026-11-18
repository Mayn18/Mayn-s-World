// How far each water tile is from land.
//
// The river is drawn pale and shallow at its edges and deeper in the middle. The
// map says only "water" or "not water", so depth is not data; this is a visual
// cue worked out from the shape of the river: the further a tile is from any
// land, the deeper it looks.
//
// It is a flood fill ("breadth-first search") that starts from every land tile at
// distance 0 and spreads outwards one ring at a time. Each water tile gets the
// number of the ring that first reaches it. Distance is counted in steps
// including diagonals, so a tile touching land only at a corner is still 1.
//
// Land tiles get 0. A map with no land at all would leave every tile at
// Infinity; the map edge does not count as land.
import type { Terrain } from '../data/types';

export function shoreDistance(terrain: Terrain): number[][] {
  const { width, height, water } = terrain;
  const distance = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => Infinity),
  );

  // Start with every land tile in the queue at distance 0.
  const queue: [number, number][] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!water[y]![x]!) {
        distance[y]![x] = 0;
        queue.push([x, y]);
      }
    }
  }

  // Spread outwards. `head` walks the queue without removing items, which is
  // much faster than shift() on a long array.
  for (let head = 0; head < queue.length; head++) {
    const [x, y] = queue[head]!;
    const next = distance[y]![x]! + 1;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        if (distance[ny]![nx]! > next) {
          distance[ny]![nx] = next;
          queue.push([nx, ny]);
        }
      }
    }
  }
  return distance;
}
