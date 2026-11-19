// What a building looks like, as plain parameters.
//
// An Appearance is a recipe: the volumes it is made of (boxes with roofs), what the
// walls and roofs are made of, and which details it has. styles.ts chooses a recipe
// for each building from its kind, district and id; painter.ts only follows the
// recipe, so a new kind of building is a new recipe, not new drawing code.
import type { MaterialName } from '../themes';

export type RoofShape = 'gable' | 'hip' | 'flat';
export type DoorStyle = 'plain' | 'arched' | 'double' | 'wide' | 'gate';

// A box of building with its own roof. Coordinates are tiles from the building's
// north-west corner and must lie inside its footprint.
export interface Volume {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  floors: number;
  roofShape: RoofShape;
  // For a gable: which way the ridge runs. Defaults to the longer side.
  ridge?: 'x' | 'y';
  // Roof height as a fraction of the half-width: about 0.55 is an ordinary pitch.
  pitch?: number;
  roof?: MaterialName;
  wall?: MaterialName;
  // Overrides the building's storey height for this volume (a tower is taller).
  floorPx?: number;
}

export type Extra =
  | { type: 'clock'; volume: number }
  | { type: 'dome' }
  | { type: 'solar' }
  | { type: 'mast' }
  | { type: 'flag' }
  | { type: 'flowerBoxes' }
  | { type: 'sign'; colour: MaterialName }
  | { type: 'steps' };

export interface Appearance {
  volumes: Volume[];
  wall: MaterialName;
  roof: MaterialName;
  // A band of stone at the foot of the walls.
  plinth: boolean;
  // Half-timbering: dark beams over pale plaster panels.
  timber: boolean;
  floorPx: number;
  shutters: MaterialName | null;
  // Window height relative to a storey (0.5 = a normal window, 0.75 = tall).
  windowHeight: number;
  // Tiles between windows, roughly (smaller = more windows).
  windowSpacing: number;
  door: DoorStyle;
  chimneys: number;
  // Striped awning over the ground floor, or null.
  awning: MaterialName | null;
  extras: Extra[];
}
