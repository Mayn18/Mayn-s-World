// What the painters need to know about roads, worked out once from the terrain.
//
// The data file says where roads run and what kind they are (data/roads.ts), and
// where they climb (crossings.ts). This module only gathers that into lookups the
// painter can ask about one tile at a time, so the painter stays a simple loop and
// the decisions stay testable without a canvas.
//
// It says nothing about colour or shape: that is the painter's job (roadPainter.ts).
import type { RoadKind } from '../data/types';
import type { TerrainModel } from '../terrain/model';
import { type CrossingStep, deckTiles, findCrossingSteps } from './crossings';
import { plazaTiles } from './plaza';

// What a land tile can be paved with. The Market Square is not a road in the data
// file; it is a paved area around the fountain (see plaza.ts).
export type GroundKind = Exclude<RoadKind, 'pier'> | 'plaza';

export type ClimbSide = 'south' | 'east';

export interface RoadLayer {
  // The ramps and stairs, keyed by the HIGH tile whose south or east face they
  // cover (see climbKey). A viewer in the south-east only sees those two faces.
  climbs: ReadonlyMap<string, CrossingStep>;
  // True where a road runs over water: a bridge deck or a pier. Indexed [y][x].
  decks: readonly (readonly boolean[])[];
  // True for the paved Market Square on land. Indexed [y][x].
  plaza: readonly (readonly boolean[])[];
}

export function climbKey(x: number, y: number, side: ClimbSide): string {
  return `${x},${y},${side}`;
}

export function buildRoadLayer(model: TerrainModel): RoadLayer {
  const climbs = new Map<string, CrossingStep>();
  for (const step of findCrossingSteps(model.terrain)) {
    // Steps that lead north or west are hidden behind the higher tile, so there is
    // nothing to draw for them.
    if (step.direction === 'S') climbs.set(climbKey(step.high.x, step.high.y, 'south'), step);
    if (step.direction === 'E') climbs.set(climbKey(step.high.x, step.high.y, 'east'), step);
  }
  return { climbs, decks: deckTiles(model.terrain), plaza: plazaTiles(model) };
}

// What a LAND tile is paved with, or null for plain ground. Water tiles are never
// ground: a road over water is a deck (see RoadLayer.decks). A pier tile that
// happens to stand on land is left as grass.
export function groundKind(model: TerrainModel, layer: RoadLayer, x: number, y: number): GroundKind | null {
  if (model.terrain.water[y]?.[x] !== false) return null;
  if (layer.plaza[y]?.[x]) return 'plaza';
  const road = model.terrain.roadTiles[y]?.[x];
  if (!road || road.kind === 'pier') return null;
  return road.kind;
}

// Streets and the square are laid with stone and get a kerb; lanes and tracks are
// packed earth and fade straight into the grass.
export function isPaved(kind: GroundKind | null): boolean {
  return kind === 'main' || kind === 'plaza';
}
