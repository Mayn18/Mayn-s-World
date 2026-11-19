// Where roads climb: ramps and stairs between two heights, and bridges over water.
//
// layout.json lists each crossing as ONE tile ("a ramp at (14, 30)"), but a road is
// 1 to 3 tiles wide, so the climb really spans the road's whole width. This works
// out, for every listed ramp or stairs, every step of ground along the road's width
// that the climb covers. The painter draws a ramp or flight of stairs over each of
// those steps, in place of the wall or slope that would otherwise be there.
import type { Crossing, RoadTile, Terrain, TileCoord } from '../data/types';
import type { Direction } from '../terrain/edges';

export interface CrossingStep {
  high: TileCoord;
  low: TileCoord;
  // The way you walk from the high tile down to the low one.
  direction: Direction;
  kind: 'ramp' | 'stairs';
  road: string;
}

const DELTA: Record<Direction, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 },
};

function roadAt(terrain: Terrain, x: number, y: number): RoadTile | null {
  return terrain.roadTiles[y]?.[x] ?? null;
}

// The steps a single listed crossing covers.
function stepsOf(terrain: Terrain, crossing: Crossing): CrossingStep[] {
  if (crossing.kind === 'bridge') return [];
  const here = roadAt(terrain, crossing.x, crossing.y);
  if (!here) return [];
  const level = terrain.levels[crossing.y]![crossing.x]!;
  // Walk along the road's own direction: east-west roads climb east or west.
  const along: Direction[] = here.axis === 'x' ? ['E', 'W'] : ['S', 'N'];
  const across = here.axis === 'x' ? { dx: 0, dy: 1 } : { dx: 1, dy: 0 };

  for (const direction of along) {
    const nx = crossing.x + DELTA[direction].dx;
    const ny = crossing.y + DELTA[direction].dy;
    const other = terrain.levels[ny]?.[nx];
    if (other === undefined || Math.abs(other - level) !== 1) continue;
    if (!roadAt(terrain, nx, ny)) continue;

    // Found the climb. Collect every tile across the road that makes the same
    // step: same two levels, same direction, both ends on this road.
    const steps: CrossingStep[] = [];
    for (let k = -3; k <= 3; k++) {
      const ax = crossing.x + across.dx * k;
      const ay = crossing.y + across.dy * k;
      const bx = ax + DELTA[direction].dx;
      const by = ay + DELTA[direction].dy;
      if (terrain.levels[ay]?.[ax] !== level || terrain.levels[by]?.[bx] !== other) continue;
      if (terrain.water[ay]![ax]! || terrain.water[by]![bx]!) continue;
      if (roadAt(terrain, ax, ay)?.name !== here.name || roadAt(terrain, bx, by)?.name !== here.name) continue;
      const highIsHere = level > other;
      const reverse: Record<Direction, Direction> = { N: 'S', S: 'N', E: 'W', W: 'E' };
      steps.push(
        highIsHere
          ? { high: { x: ax, y: ay }, low: { x: bx, y: by }, direction, kind: crossing.kind, road: here.name }
          : { high: { x: bx, y: by }, low: { x: ax, y: ay }, direction: reverse[direction], kind: crossing.kind, road: here.name },
      );
    }
    // Contiguous tiles only: stop at the first gap on each side of the listed tile.
    return contiguous(steps, crossing, across);
  }
  return [];
}

function contiguous(
  steps: CrossingStep[],
  crossing: Crossing,
  across: { dx: number; dy: number },
): CrossingStep[] {
  const offset = (s: CrossingStep) => {
    const t = s.direction === 'E' || s.direction === 'W' ? s : s;
    const base = across.dx !== 0 ? crossing.x : crossing.y;
    const at = across.dx !== 0 ? Math.min(t.high.x, t.low.x) : Math.min(t.high.y, t.low.y);
    // For steps along x, across is y; for steps along y, across is x: use the
    // coordinate that is the same for high and low.
    const same = across.dx !== 0 ? t.high.x : t.high.y;
    return { value: same - base, at };
  };
  const byOffset = new Map(steps.map((s) => [offset(s).value, s]));
  const kept: CrossingStep[] = [];
  for (const sign of [1, -1]) {
    for (let k = sign === 1 ? 0 : -1; Math.abs(k) <= 3; k += sign) {
      const step = byOffset.get(k);
      if (!step) break;
      kept.push(step);
    }
  }
  return kept;
}

export function findCrossingSteps(terrain: Terrain): CrossingStep[] {
  const seen = new Set<string>();
  const result: CrossingStep[] = [];
  for (const crossing of terrain.crossings) {
    for (const step of stepsOf(terrain, crossing)) {
      const key = `${step.high.x},${step.high.y}>${step.direction}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(step);
    }
  }
  return result;
}

// Road tiles that lie over water: bridge decks and piers. Indexed [y][x].
export function deckTiles(terrain: Terrain): boolean[][] {
  return terrain.roadTiles.map((row, y) =>
    row.map((tile, x) => tile !== null && terrain.water[y]![x]!),
  );
}
