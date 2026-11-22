// Draws the whole terrain onto a canvas.
//
// This and waterPainter.ts are the only files that touch the canvas for the
// ground. What to draw, and in what order, is decided elsewhere and tested without
// a canvas: the terrain model (terrain/model.ts) holds the heights, the classified
// faces and the drawing order; projection.ts holds the maths.
//
// For each tile, in the model's back-to-front order, it draws:
//   1. the south face, if the ground drops (or the map ends) on that side
//   2. the east face, likewise
//   3. the top surface: grass shaded by level, or water
//   4. anything laid on the ground there: a ramp or stairs over a face (just after
//      the face), a street, lane, track or the square over the top, or a bridge
//      deck over the water (roadPainter.ts). Optional: with no road layer given,
//      only bare terrain is drawn.
//
//          N                A face hangs from the W-S edge (south face, lit) or
//        /   \              the S-E edge (east face, shaded). The viewer is
//      W   +   E            south-east of the map, so the north and west sides
//        \   /              of a tile face away and are never visible.
//          S
//
// Faces go before the top so the top sits cleanly over its own faces' top edge.
// Far-to-near order (see depth.ts) makes nearer ground and its faces cover whatever
// lies behind them.
import type { TerrainFace } from '../terrain/edges';
import { type RoadLayer, groundKind } from '../roads/roadLayer';
import type { TerrainModel } from '../terrain/model';
import type { Bounds } from './bounds';
import { type Side, faceCorners, faceLine } from './faceGeometry';
import { type ScreenPoint, tileCorners } from './projection';
import { paintClimb, paintGround } from './roadPainter';
import { fillPolygon, strokeLine } from './shapes';
import type { TerrainPalette } from './terrainPalette';
import { paintWaterTile } from './waterPainter';

// How tall the pale cap on top of a retaining wall is, in picture pixels.
const WALL_CAP_PX = 2;

export interface TileRange {
  start: number;
  end: number;
}

function paintFace(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  side: Side,
  face: TerrainFace,
  palette: TerrainPalette,
) {
  const colours = palette.faces[face.kind];
  const [topLeft, topRight, bottomRight, bottomLeft] = faceCorners(x, y, side, face);
  fillPolygon(ctx, [topLeft, topRight, bottomRight, bottomLeft], side === 'south' ? colours.lit : colours.shade);

  // Masonry courses and rock strata: a thin line at every whole level between the
  // top and the bottom, which also makes a tall cliff read as several steps tall.
  if (face.kind === 'cliff' || face.kind === 'skirt' || face.kind === 'waterSkirt') {
    for (let level = Math.ceil(face.bottom + 1e-9); level < face.top - 1e-9; level++) {
      const [from, to] = faceLine(x, y, side, level);
      strokeLine(ctx, from, to, colours.line);
    }
  }

  // A pale cap along the top edge of a built wall.
  if (face.kind === 'wall') {
    const down = (p: ScreenPoint): ScreenPoint => ({ sx: p.sx, sy: p.sy + WALL_CAP_PX });
    fillPolygon(ctx, [topLeft, topRight, down(topRight), down(topLeft)], palette.wallCap);
  }
}

// `bounds` says where the world's top-left falls in projection space (see
// worldBounds). The painter shifts the origin so the picture starts at (0, 0).
export function paintTerrain(
  ctx: CanvasRenderingContext2D,
  model: TerrainModel,
  palette: TerrainPalette,
  bounds: Bounds,
  roads?: RoadLayer,
  decorate?: (ctx: CanvasRenderingContext2D, x: number, y: number) => void,
  range?: TileRange,
): void {
  ctx.save();
  ctx.translate(-bounds.left, -bounds.top);

  const start = Math.max(0, Math.min(model.order.length, Math.floor(range?.start ?? 0)));
  const end = Math.max(start, Math.min(model.order.length, Math.floor(range?.end ?? model.order.length)));
  for (let index = start; index < end; index++) {
    const { x, y } = model.order[index]!;
    const { south, east } = model.faces[y]![x]!;
    if (south) paintFace(ctx, x, y, 'south', south, palette);
    if (south && roads) paintClimb(ctx, model, roads, x, y, 'south', south, palette);
    if (east) paintFace(ctx, x, y, 'east', east, palette);
    if (east && roads) paintClimb(ctx, model, roads, x, y, 'east', east, palette);

    // A road, the square or a bridge deck covers the whole tile, so the grass or
    // water under it is not drawn. Drawing it first would let it show through as a
    // faint line along every tile edge, where the canvas smooths the polygon edges.
    const covered = roads !== undefined && (roads.decks[y]![x]! || groundKind(model, roads, x, y) !== null);
    if (!covered) {
      if (model.terrain.water[y]![x]!) {
        paintWaterTile(ctx, model, x, y, palette);
      } else {
        const level = model.terrain.levels[y]![x]!;
        fillPolygon(ctx, tileCorners(x, y, model.surface[y]![x]!), palette.top[level]!);
      }
    }
    if (roads) paintGround(ctx, model, roads, x, y, palette);
    // Buildings and their shadows are drawn by their own module, tile by tile in
    // this same far-to-near order so they sort correctly against the terrain.
    decorate?.(ctx, x, y);
  }

  ctx.restore();
}
