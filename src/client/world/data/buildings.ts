// Reads the building footprints from layout.json.
//
// Each building has a position and size in tiles (x, y is its north-west corner,
// w tiles east-west, d tiles north-south), a kind that decides how it is drawn, a
// door tile, and, for the six destination buildings, which website destination it
// opens. Nothing here decides how a building LOOKS; that is buildings/styles.ts.
import type { DestinationId } from '../../content/destinations';

export type BuildingTier = 'primary' | 'landmark' | 'castle' | 'commercial' | 'civic' | 'optional' | 'decor';

export interface Building {
  id: number;
  name: string;
  kind: string;
  tier: BuildingTier;
  x: number;
  y: number;
  w: number;
  d: number;
  // The tile just outside the entrance, or null for buildings with none.
  door: { x: number; y: number } | null;
  // The website section it opens, for the six destination buildings only.
  destination: DestinationId | null;
}

// layout.json numbers the seven destinations 1 to 7 (as on the labelled aerial
// view). Home (1) is the whole town, not a building, so it is not listed.
const DESTINATION_BY_NUMBER: Record<number, DestinationId> = {
  2: 'about',
  3: 'projects',
  4: 'blog',
  5: 'resume',
  6: 'contact',
  7: 'github',
};

const TIERS: readonly string[] = ['primary', 'landmark', 'castle', 'commercial', 'civic', 'optional', 'decor'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readBuildings(raw: unknown, width: number, height: number): Building[] {
  if (!Array.isArray(raw)) throw new Error('layout.json: "buildings" must be a list');
  const seen = new Set<number>();
  return raw.map((entry: unknown, index) => {
    if (!isRecord(entry)) throw new Error(`layout.json: buildings[${index}] must be an object`);
    const { id, name, kind, tier, x, y, w, d, door, destination } = entry;
    const whole = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
    if (!whole(id) || typeof name !== 'string' || typeof kind !== 'string') {
      throw new Error(`layout.json: buildings[${index}] needs an integer "id" and text "name" and "kind"`);
    }
    if (seen.has(id)) throw new Error(`layout.json: building id ${id} appears twice`);
    seen.add(id);
    if (typeof tier !== 'string' || !TIERS.includes(tier)) {
      throw new Error(`layout.json: building ${id} has an unknown tier "${String(tier)}"`);
    }
    if (!whole(x) || !whole(y) || !whole(w) || !whole(d) || w < 1 || d < 1) {
      throw new Error(`layout.json: building ${id} needs whole-number x, y, w, d (w and d at least 1)`);
    }
    if (x < 0 || y < 0 || x + w > width || y + d > height) {
      throw new Error(`layout.json: building ${id} extends outside the ${width} x ${height} map`);
    }
    let doorTile: Building['door'] = null;
    if (door !== null && door !== undefined) {
      if (!Array.isArray(door) || door.length !== 2 || !whole(door[0]) || !whole(door[1])) {
        throw new Error(`layout.json: building ${id} "door" must be [x, y] or null`);
      }
      doorTile = { x: door[0], y: door[1] };
    }
    let dest: DestinationId | null = null;
    if (destination !== null && destination !== undefined) {
      if (!whole(destination) || !DESTINATION_BY_NUMBER[destination]) {
        throw new Error(`layout.json: building ${id} has an unknown destination ${String(destination)}`);
      }
      dest = DESTINATION_BY_NUMBER[destination]!;
    }
    return { id, name, kind, tier: tier as BuildingTier, x, y, w, d, door: doorTile, destination: dest };
  });
}
