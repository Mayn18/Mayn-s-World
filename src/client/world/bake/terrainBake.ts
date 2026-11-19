// Paints one tile of the terrain into the pixel buffer: its visible faces, its top,
// and anything laid over it that belongs to the ground (a bridge deck, a ramp).
//
// bakeWorld.ts calls this for every tile in back-to-front order and inserts the
// buildings and plants in between, so nearer things correctly cover farther ones.
import type { PixelBuffer, Point, Shader } from '../pixel/buffer';
import { hash2 } from '../pixel/random';
import { faceCorners } from '../render/faceGeometry';
import { LEVEL_PX, tileCorners } from '../render/projection';
import { type CrossingStep, deckTiles, findCrossingSteps } from '../roads/crossings';
import type { TerrainFace } from '../terrain/edges';
import type { TerrainModel } from '../terrain/model';
import { type FaceSide, climbShader, faceShader } from './faces';
import { type GroundContext, landShader, waterShader } from './ground';
import { type ArtSpace, toArt } from './space';
import { plazaTiles } from './zones';
import type { Materials } from './materials';

export interface TerrainBakeContext extends GroundContext {
  // Ramps and stairs, keyed "x,y,side" of the high tile whose face they cover.
  climbs: Map<string, CrossingStep>;
  decks: boolean[][];
}

export function createBakeContext(model: TerrainModel, mats: Materials, space: ArtSpace): TerrainBakeContext {
  const climbs = new Map<string, CrossingStep>();
  for (const step of findCrossingSteps(model.terrain)) {
    if (step.direction === 'S') climbs.set(`${step.high.x},${step.high.y},south`, step);
    if (step.direction === 'E') climbs.set(`${step.high.x},${step.high.y},east`, step);
  }
  return { model, mats, space, plaza: plazaTiles(model), climbs, decks: deckTiles(model.terrain) };
}

function artPoints(space: ArtSpace, points: { sx: number; sy: number }[]): Point[] {
  return points.map((p) => toArt(space, p));
}

function paintFace(
  buf: PixelBuffer,
  ctx: TerrainBakeContext,
  x: number,
  y: number,
  side: FaceSide,
  face: TerrainFace,
): void {
  const quad = artPoints(ctx.space, faceCorners(x, y, side, face));
  const [tl, tr, br] = quad as [Point, Point, Point, Point];
  const geom = { x0: tl.x, x1: tr.x, y0: tl.y, y1: tr.y };
  const height = br.y - tr.y;
  const level = ctx.model.terrain.levels[y]![x]!;

  const step = ctx.climbs.get(`${x},${y},${side}`);
  let shader: Shader;
  if (step) {
    const road = ctx.model.terrain.roadTiles[y]![x];
    const paved = road?.kind === 'main';
    shader = climbShader(step.kind, paved, side, geom, ctx.mats);
  } else {
    shader = faceShader(face.kind, side, geom, ctx.mats, level, height);
  }
  buf.fillPolygon(quad, shader);
}

function plankShader(ctx: TerrainBakeContext, x: number, y: number, axis: 'x' | 'y', stone: boolean): Shader {
  const surf = ctx.model.terrain.levels[y]![x]!;
  const { mats, space } = ctx;
  const plank = mats.ramp.plank;
  const pave = mats.ramp.pave;
  const stoneRamp = mats.ramp.stone;
  const deckAt = (dx: number, dy: number) => ctx.decks[y + dy]?.[x + dx] === true;
  // For each side: is it open (no more deck beyond it)?
  const open = [!deckAt(-1, 0), !deckAt(1, 0), !deckAt(0, -1), !deckAt(0, 1)];
  const dist = (u: number, v: number) => [u, 1 - u, v, 1 - v];

  return (ax, ay) => {
    const sx = ax / 2 + space.left + 0.25;
    const sy = ay / 2 + space.top + 0.25;
    // invert the projection at the deck's height
    const mx = (sx / 16 + (sy + LEVEL_PX * surf) / 8) / 2;
    const my = ((sy + LEVEL_PX * surf) / 8 - sx / 16) / 2;
    const u = Math.min(1, Math.max(0, mx - x));
    const v = Math.min(1, Math.max(0, my - y));
    const d = dist(u, v);
    // Railings or parapets along the open sides, perpendicular to the way the road runs.
    const sides = axis === 'x' ? [2, 3] : [0, 1];
    for (const i of sides) {
      if (!open[i]) continue;
      if (d[i]! < 0.05) return stone ? stoneRamp[0]! : plank[0]!;
      if (d[i]! < 0.13) return stone ? stoneRamp[3]! : plank[3]!;
      if (d[i]! < 0.17) return stone ? stoneRamp[1]! : plank[1]!;
    }
    if (stone) {
      const row = Math.floor((axis === 'x' ? v : u) * 5);
      const along = (axis === 'x' ? u : v) * 5 + (row % 2) * 0.5;
      const col = Math.floor(along);
      const f = along - col;
      const g = (axis === 'x' ? v : u) * 5 - row;
      if (f < 0.1 || g < 0.12) return pave[0]!;
      const tone = hash2(col, row, x * 7 + y);
      return pave[tone < 0.2 ? 1 : tone < 0.75 ? 2 : 3]!;
    }
    // Planks run along the road; seams between them, and an end joint now and then.
    const across = (axis === 'x' ? v : u) * 6;
    const index = Math.floor(across);
    const seam = across - index < 0.14;
    const along = (axis === 'x' ? u : v) * 2 + hash2(index, x, y) * 2;
    const butt = along - Math.floor(along) < 0.05;
    if (seam || butt) return plank[0]!;
    const tone = hash2(index, Math.floor(along), 61);
    return plank[tone < 0.25 ? 1 : tone < 0.8 ? 2 : 3]!;
  };
}

function paintDeck(buf: PixelBuffer, ctx: TerrainBakeContext, x: number, y: number): void {
  const tile = ctx.model.terrain.roadTiles[y]![x]!;
  const level = ctx.model.terrain.levels[y]![x]!;
  const stone = tile.kind === 'main';
  const bottom = ctx.model.surface[y]![x]! - 0.7; // reaches below the waterline

  const faceOf = (side: FaceSide): void => {
    const dx = side === 'east' ? 1 : 0;
    const dy = side === 'south' ? 1 : 0;
    if (ctx.decks[y + dy]?.[x + dx]) return; // the deck carries on: no side to see
    const face: TerrainFace = { kind: stone ? 'castle' : 'wall', top: level, bottom };
    const quad = artPoints(ctx.space, faceCorners(x, y, side, face));
    const [tl, tr, br] = quad as [Point, Point, Point, Point];
    const geom = { x0: tl.x, x1: tr.x, y0: tl.y, y1: tr.y };
    const lit = side === 'south';
    const r = stone ? ctx.mats.ramp.stone : ctx.mats.ramp.plank;
    buf.fillPolygon(quad, (ax, ay) => {
      const d = ay + 0.5 - (geom.y0 + ((ax + 0.5 - geom.x0) / (geom.x1 - geom.x0)) * (geom.y1 - geom.y0));
      if (d < 2) return r[lit ? 3 : 2]!;
      if (!stone) {
        const post = Math.floor((ax - geom.x0) / 9) % 2 === 0;
        return r[(lit ? 2 : 1) - (post ? 0 : 1)]!;
      }
      return r[lit ? 2 : 1]!;
    });
    void br;
  };
  faceOf('south');
  faceOf('east');
  buf.fillPolygon(
    artPoints(ctx.space, tileCorners(x, y, level)),
    plankShader(ctx, x, y, tile.axis, stone),
  );
}

export function paintTile(buf: PixelBuffer, ctx: TerrainBakeContext, x: number, y: number): void {
  const { model, space } = ctx;
  const { south, east } = model.faces[y]![x]!;
  if (south) paintFace(buf, ctx, x, y, 'south', south);
  if (east) paintFace(buf, ctx, x, y, 'east', east);

  const corners = artPoints(space, tileCorners(x, y, model.surface[y]![x]!));
  buf.fillPolygon(corners, model.terrain.water[y]![x]! ? waterShader(ctx, x, y) : landShader(ctx, x, y));

  if (ctx.decks[y]![x]!) paintDeck(buf, ctx, x, y);
}
