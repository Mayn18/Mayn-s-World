// Draws what lies on the ground: streets, lanes, tracks, the Market Square, ramps,
// stairs and bridges.
//
// Everything is a flat polygon in one colour, in the same plain style as the
// terrain (terrainPainter.ts). There is no texture: a street is a pale surface with
// a kerb, a lane or track is a plain earthen strip, stairs are a face with a lit
// edge on every tread. Detail comes from shape, colour and light direction.
//
// terrainPainter.ts calls these from inside its far-to-near loop, so a road is
// painted straight after the grass tile it lies on, and nearer ground and walls
// still cover it correctly.
//
//   paintGround  the top of a road or square tile, or the deck of a bridge
//   paintClimb   a ramp or flight of stairs laid over a wall or bank face
import type { TerrainFace } from '../terrain/edges';
import type { TerrainModel } from '../terrain/model';
import { type ClimbSide, type RoadLayer, climbKey, groundKind, isPaved } from '../roads/roadLayer';
import { faceCorners } from './faceGeometry';
import { LEVEL_PX, type ScreenPoint, mapToScreen, tileCorners } from './projection';
import { fillPolygon, strokeLine } from './shapes';
import type { TerrainPalette } from './terrainPalette';

// Widths are in picture pixels. A tile is 32 wide, so these are thin on purpose.
const KERB_PX = 1.4;
const RAIL_PX = 1.6;
const EDGE_PX = 1.5;
// How far below the waterline a bridge's side reaches, in levels.
const DECK_DEPTH_LEVELS = 0.5;
// One tread for roughly every this many pixels of stair height.
const TREAD_PX = 3.5;

// The four sides of a tile: the neighbour each faces and the two corners (as map
// offsets) it joins. North side runs N-E, east side E-S, south side S-W, west W-N.
const SIDES = [
  { dx: 0, dy: -1, from: [0, 0], to: [1, 0] },
  { dx: 1, dy: 0, from: [1, 0], to: [1, 1] },
  { dx: 0, dy: 1, from: [1, 1], to: [0, 1] },
  { dx: -1, dy: 0, from: [0, 1], to: [0, 0] },
] as const;

// Strokes the chosen sides of a tile as a thin line just inside the tile's edge.
//
// The line is moved in from the edge by a hair and runs the full length of the
// side, so lines on neighbouring tiles join into one unbroken kerb. (Clipping the
// stroke to the tile instead would thin it to nothing at the diamond's sharp
// corners and leave a tick between every pair of tiles.)
const INSET = 0.05; // in tiles

function strokeSides(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  level: number,
  sides: readonly boolean[],
  colour: string,
  width: number,
) {
  SIDES.forEach((side, i) => {
    if (!sides[i]) return;
    // Move the side towards the tile's middle: add INSET along the axis that the
    // side's neighbour lies on, in the opposite direction.
    const ox = -side.dx * INSET;
    const oy = -side.dy * INSET;
    strokeLine(
      ctx,
      mapToScreen(x + side.from[0] + ox, y + side.from[1] + oy, level),
      mapToScreen(x + side.to[0] + ox, y + side.to[1] + oy, level),
      colour,
      width,
    );
  });
}

// The top of a road or square tile on land, or the deck of a bridge over water.
export function paintGround(
  ctx: CanvasRenderingContext2D,
  model: TerrainModel,
  layer: RoadLayer,
  x: number,
  y: number,
  palette: TerrainPalette,
): void {
  if (layer.decks[y]![x]!) {
    paintDeck(ctx, model, layer, x, y, palette);
    return;
  }
  const kind = groundKind(model, layer, x, y);
  if (!kind) return;

  const level = model.surface[y]![x]!;
  const surface =
    kind === 'plaza' && layer.plazaRim[y]?.[x]
      ? palette.roads.surface.plazaEdge
      : palette.roads.surface[kind];
  fillPolygon(ctx, tileCorners(x, y, level), surface);

  // A kerb along every side of paved ground that borders anything else.
  if (isPaved(kind)) {
    const open = SIDES.map((s) => !isPaved(groundKind(model, layer, x + s.dx, y + s.dy)));
    strokeSides(ctx, x, y, level, open, palette.roads.kerb, KERB_PX);
  }
}

function paintDeck(
  ctx: CanvasRenderingContext2D,
  model: TerrainModel,
  layer: RoadLayer,
  x: number,
  y: number,
  palette: TerrainPalette,
): void {
  const road = model.terrain.roadTiles[y]![x]!;
  const colours = road.kind === 'main' ? palette.roads.stone : palette.roads.timber;
  // The deck is level with the land at either end, which is a little above the
  // water, so the river is seen running underneath.
  const deckLevel = model.terrain.levels[y]![x]!;
  const bottom = model.surface[y]![x]! - DECK_DEPTH_LEVELS;

  // Open water on a side: no more deck there, and not land either.
  const open = SIDES.map((s) => {
    const nx = x + s.dx;
    const ny = y + s.dy;
    return model.terrain.water[ny]?.[nx] === true && !layer.decks[ny]![nx]!;
  });

  // A side you can see (south and east) hangs down to the water. Where the deck
  // carries on, or meets land, there is no side to show.
  const side = (which: ClimbSide, index: number) => {
    if (!open[index]) return;
    const face: TerrainFace = { kind: 'wall', top: deckLevel, bottom };
    const [tl, tr, br, bl] = faceCorners(x, y, which, face) as [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];
    fillPolygon(ctx, [tl, tr, br, bl], which === 'south' ? colours.face.lit : colours.face.shade);
  };
  side('south', 2);
  side('east', 1);

  fillPolygon(ctx, tileCorners(x, y, deckLevel), colours.deck);
  strokeSides(ctx, x, y, deckLevel, open, colours.rail, RAIL_PX);
}

// Lays a ramp or a flight of stairs over the face it climbs, if there is one.
export function paintClimb(
  ctx: CanvasRenderingContext2D,
  model: TerrainModel,
  layer: RoadLayer,
  x: number,
  y: number,
  side: ClimbSide,
  face: TerrainFace,
  palette: TerrainPalette,
): void {
  const step = layer.climbs.get(climbKey(x, y, side));
  if (!step) return;

  const lit = side === 'south';
  const [tl, tr, br, bl] = faceCorners(x, y, side, face) as [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];
  const colours =
    step.kind === 'stairs'
      ? palette.roads.stairs
      : model.terrain.roadTiles[y]![x]!.kind === 'main'
        ? palette.roads.rampPaved
        : palette.roads.rampEarth;
  fillPolygon(ctx, [tl, tr, br, bl], lit ? colours.lit : colours.shade);

  if (step.kind === 'stairs') {
    // A lit edge at the front of every tread, evenly spaced down the face.
    const treads = Math.max(2, Math.round(((face.top - face.bottom) * LEVEL_PX) / TREAD_PX));
    for (let i = 1; i < treads; i++) {
      const t = i / treads;
      strokeLine(ctx, lerp(tl, bl, t), lerp(tr, br, t), palette.roads.stairs.line, 1);
    }
  }

  // Where the ramp or stairs ends and a wall or bank begins, a thin edge keeps the
  // two apart. Between two neighbouring steps of one wide flight there is none.
  const [leftDx, leftDy, rightDx, rightDy] = side === 'south' ? [-1, 0, 1, 0] : [0, 1, 0, -1];
  if (!layer.climbs.has(climbKey(x + leftDx, y + leftDy, side))) {
    strokeLine(ctx, tl, bl, palette.roads.kerb, EDGE_PX);
  }
  if (!layer.climbs.has(climbKey(x + rightDx, y + rightDy, side))) {
    strokeLine(ctx, tr, br, palette.roads.kerb, EDGE_PX);
  }
}

function lerp(a: ScreenPoint, b: ScreenPoint, t: number): ScreenPoint {
  return { sx: a.sx + (b.sx - a.sx) * t, sy: a.sy + (b.sy - a.sy) * t };
}
