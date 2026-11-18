// The shape of the world data, as the renderer sees it.
//
// layout.json is the source of truth for the map, but it is written for
// storage, not for use: each row of the grid is one long string such as
// "33333344444...". loader.ts turns it into the structures below, so the rest
// of the code never touches a raw string.
//
// Only the terrain exists so far (milestone 1). Buildings, roads and props are
// added here, one at a time, when something needs to draw them.

// A tile coordinate. x grows to the east (right on the map), y to the south
// (down on the map). Tile (x, y) covers the square [x, x+1] by [y, y+1].
export interface TileCoord {
  x: number;
  y: number;
}

export interface Terrain {
  width: number; // tiles, west to east
  height: number; // tiles, north to south
  // Elevation level of each tile, indexed as levels[y][x]. 0 is the lowest;
  // each level is one step up (LEVEL_PX tall on screen, see projection.ts).
  levels: readonly (readonly number[])[];
  // True where the tile is water, indexed as water[y][x].
  water: readonly (readonly boolean[])[];
}
