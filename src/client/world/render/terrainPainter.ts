// Draws a patch of terrain onto a canvas.
//
// This is the only file in milestone 1 that touches the canvas. Everything it
// needs to decide (where a tile goes, what order to draw in) comes from
// projection.ts, patch.ts and depth.ts, which are tested without a canvas.
//
// For each tile, in back-to-front order (depth.ts), it draws:
//   1. its cliff faces, if the neighbouring tile to the south or east is lower
//   2. its top surface, a diamond
//
//          N                The south neighbour is lower:       The east
//        /   \              a face hangs from the S-W edge      neighbour is
//      W   +   E            (W to S corner), as tall as the     lower: a face
//        \   /              drop.                               hangs from the
//          S                                                    S-E edge.
//
// Only south and east faces are drawn because the viewer is south-east of the
// map: the north and west sides of a tile face away and are never visible.
//
// THE EDGE SLAB
// Beyond the patch's south and east edges there is nothing to compare with.
// Those tiles are treated as having a neighbour at level -1, so each edge tile
// gets a one-level-tall face. The patch therefore looks like a solid block of
// ground cut out of the map instead of a floating sheet.
import type { Terrain } from '../data/types';
import { backToFront } from './depth';
import { type Bounds, type Patch, inPatch, tilesInPatch } from './patch';
import { LEVEL_PX, mapToScreen, tileCorners, type ScreenPoint } from './projection';
import type { TerrainPalette } from './terrainPalette';

const BELOW_EDGE_LEVEL = -1;

// Fills a polygon. The fill is followed by a 1 px stroke of the same colour on
// purpose: neighbouring polygons share edges, and the canvas smooths (anti-
// aliases) diagonal edges, which would leave faint hairline gaps between them.
// The stroke grows each shape by half a pixel, which hides the seams.
function fillPolygon(ctx: CanvasRenderingContext2D, points: ScreenPoint[], colour: string) {
  ctx.beginPath();
  points.forEach(({ sx, sy }, i) => (i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy)));
  ctx.closePath();
  ctx.fillStyle = colour;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  ctx.fill();
  ctx.stroke();
}

// The level of the tile at (x, y) as the painter sees it: the real level inside
// the patch, the slab level outside it.
function levelSeenFromPatch(terrain: Terrain, patch: Patch, x: number, y: number): number {
  return inPatch(patch, x, y) ? terrain.levels[y]![x]! : BELOW_EDGE_LEVEL;
}

// `bounds` says where the patch's top-left falls on screen (see patchBounds).
// The painter shifts the origin so that the patch starts at the canvas's (0, 0).
export function paintTerrain(
  ctx: CanvasRenderingContext2D,
  terrain: Terrain,
  patch: Patch,
  palette: TerrainPalette,
  bounds: Bounds,
): void {
  ctx.save();
  ctx.translate(-bounds.left, -bounds.top);

  for (const { x, y } of backToFront(tilesInPatch(patch))) {
    const level = terrain.levels[y]![x]!;

    // South face: from the tile's W corner to its S corner, down to the lower
    // neighbour's level. Straight down = same sx, larger sy.
    const southLevel = levelSeenFromPatch(terrain, patch, x, y + 1);
    if (southLevel < level) {
      const w = mapToScreen(x, y + 1, level);
      const s = mapToScreen(x + 1, y + 1, level);
      const drop = (level - southLevel) * LEVEL_PX;
      fillPolygon(
        ctx,
        [w, s, { sx: s.sx, sy: s.sy + drop }, { sx: w.sx, sy: w.sy + drop }],
        palette.faceLit,
      );
    }

    // East face: from the tile's S corner to its E corner.
    const eastLevel = levelSeenFromPatch(terrain, patch, x + 1, y);
    if (eastLevel < level) {
      const s = mapToScreen(x + 1, y + 1, level);
      const e = mapToScreen(x + 1, y, level);
      const drop = (level - eastLevel) * LEVEL_PX;
      fillPolygon(
        ctx,
        [s, e, { sx: e.sx, sy: e.sy + drop }, { sx: s.sx, sy: s.sy + drop }],
        palette.faceShade,
      );
    }

    // The top surface goes last so it sits over the top edge of its own faces.
    const colour = terrain.water[y]![x]! ? palette.water : palette.top[level]!;
    fillPolygon(ctx, tileCorners(x, y, level), colour);
  }

  ctx.restore();
}
