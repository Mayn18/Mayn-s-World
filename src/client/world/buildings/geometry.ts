// Placing a building's own coordinates in the picture.
//
// A building is described in its own small space: mx tiles east and my tiles south
// of its north-west corner, z pixels above the ground. `at` turns that into the
// picture's screen coordinates with the same projection as the terrain (32 x 16
// tiles, 10 px a level), so buildings line up with the ground exactly.
import { type ScreenPoint, mapToScreen } from '../render/projection';

export interface Origin {
  // The tile at the building's north-west corner, and the level its ground is at.
  x: number;
  y: number;
  level: number;
}

export function at(o: Origin, mx: number, my: number, z: number): ScreenPoint {
  const p = mapToScreen(o.x + mx, o.y + my, o.level);
  return { sx: p.sx, sy: p.sy - z };
}
