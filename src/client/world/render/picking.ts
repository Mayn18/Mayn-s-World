// Picking: which tile is under a point on the screen?
//
// This is the reverse of drawing, and it is what hover labels and clicks use. It
// works against the terrain model so it sees the same surface heights the painter
// draws, including water sitting a little below land.
//
// WHY NOT JUST screenToMap?
// screenToMap answers "which map point is here, if the ground were at level L?".
// But the ground is not at one level: a point on screen could be on a high tile
// that is far away or a low tile that is near, and the high one hides the low
// one. So we ask the question tile by tile, nearest first, and the first tile
// whose top surface contains the point is the one the visitor can see. That is
// exactly the drawing order run backwards.
//
// Limitation: only the flat tops of tiles are tested. A point on a cliff face
// returns whatever tile is visible behind it. That is fine for the readout; when
// cliffs or buildings need to be clickable, they get their own test.
import type { TileCoord } from '../data/types';
import type { TerrainModel } from '../terrain/model';
import { TILE_H, TILE_W, tileCenter } from './projection';

export interface PickedTile extends TileCoord {
  level: number;
  water: boolean;
}

// A diamond is every point whose distance from the centre, measured in
// half-widths horizontally plus half-heights vertically, is at most 1:
//     |dx| / 16 + |dy| / 8 <= 1
function insideDiamond(dx: number, dy: number): boolean {
  return Math.abs(dx) / (TILE_W / 2) + Math.abs(dy) / (TILE_H / 2) <= 1;
}

// sx and sy are in the same screen space that mapToScreen produces (before the
// canvas offset is added), so the caller adds the world bounds' top-left first.
export function pickTile(model: TerrainModel, sx: number, sy: number): PickedTile | null {
  // model.order runs far to near, so walk it backwards: nearest tile first.
  for (let i = model.order.length - 1; i >= 0; i--) {
    const tile = model.order[i]!;
    const centre = tileCenter(tile, model.surface[tile.y]![tile.x]!);
    if (insideDiamond(sx - centre.sx, sy - centre.sy)) {
      return {
        ...tile,
        level: model.terrain.levels[tile.y]![tile.x]!,
        water: model.terrain.water[tile.y]![tile.x]!,
      };
    }
  }
  return null;
}
