// Small hand-made terrains for tests. Not used by the app.
import type { Crossing, Terrain } from '../data/types';

interface Options {
  water?: boolean[][];
  roads?: boolean[][];
  crossings?: Crossing[];
}

// `levels` is indexed [y][x], like the real data. Anything not given is empty:
// no water, no roads, no crossings.
export function makeTerrain(levels: number[][], options: Options = {}): Terrain {
  const blank = () => levels.map((row) => row.map(() => false));
  return {
    width: levels[0]!.length,
    height: levels.length,
    levels,
    water: options.water ?? blank(),
    roads: options.roads ?? blank(),
    crossings: options.crossings ?? [],
  };
}
