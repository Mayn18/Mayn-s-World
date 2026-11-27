// Ground zones that layout.json does not describe but the reference artwork shows.
//
// The data file says where roads are and where the fountain stands, but not that
// the fountain sits in a paved square. That square is a visual decision, so it
// lives here, keyed to the file's fountain position, not inside the JSON (the data
// README explains why renderer-side detail stays out of the file).
import type { TerrainModel } from '../terrain/model';

// Centre of the Market Square (the fountain at 37,29, 3 x 3 tiles).
export const PLAZA_CENTRE = { x: 38.5, y: 30.5 };
// How far the square reaches in tiles. A squarish "superellipse" (rounded
// rectangle) is used so the corners are paved but not boxy.
const PLAZA_RX = 7.2;
const PLAZA_RY = 5.6;

export function isPlaza(x: number, y: number): boolean {
  const dx = Math.abs(x + 0.5 - PLAZA_CENTRE.x) / PLAZA_RX;
  const dy = Math.abs(y + 0.5 - PLAZA_CENTRE.y) / PLAZA_RY;
  return dx ** 4 + dy ** 4 <= 1;
}

// Plaza tiles that are land, indexed [y][x].
export function plazaTiles(model: TerrainModel): boolean[][] {
  return model.terrain.levels.map((row, y) =>
    row.map((_, x) => isPlaza(x, y) && !model.terrain.water[y]![x]!),
  );
}

// The outer course is one tile deep and follows the square's rounded perimeter.
export function plazaRimTiles(model: TerrainModel): boolean[][] {
  const inside = plazaTiles(model);
  return inside.map((row, y) =>
    row.map(
      (tile, x) =>
        tile &&
        [
          [0, -1],
          [1, 0],
          [0, 1],
          [-1, 0],
        ].some(([dx, dy]) => !inside[y + dy!]?.[x + dx!]),
    ),
  );
}
