// Small hand-made terrains for tests. Not used by the app.
import type { Crossing, RoadTile, Terrain } from '../data/types';

interface Options {
  water?: boolean[][];
  roads?: boolean[][];
  // What each road tile is. Overrides `roads`, which makes every road a plain
  // east-west main street.
  roadTiles?: (RoadTile | null)[][];
  crossings?: Crossing[];
}

// `levels` is indexed [y][x], like the real data. Anything not given is empty:
// no water, no roads, no crossings.
export function makeTerrain(levels: number[][], options: Options = {}): Terrain {
  const blank = () => levels.map((row) => row.map(() => false));
  const roadTiles =
    options.roadTiles ??
    (options.roads ?? blank()).map((row) =>
      row.map((on) => (on ? ({ kind: 'main', axis: 'x', name: 'test' } as const) : null)),
    );
  return {
    width: levels[0]!.length,
    height: levels.length,
    levels,
    water: options.water ?? blank(),
    roads: options.roadTiles ? roadTiles.map((row) => row.map((tile) => tile !== null)) : (options.roads ?? blank()),
    crossings: options.crossings ?? [],
    roadTiles,
  };
}
