// Draws water: a tile's surface, shaded by depth, with a pale line where it
// meets the shore.
//
// WHAT IS DATA AND WHAT IS LOOK
// The data says only which tiles are water. The rest is derived:
//   - the surface sits slightly below the ground at the same level (model.ts,
//     WATER_DROP_LEVELS), so the neighbouring land has a visible bank face
//   - colour deepens with distance from land (terrain/shore.ts)
//   - pixel glints and a pale edge clarify the water against the shore
// Nothing here invents water: it only draws the tiles the data marks as water.
import type { TerrainModel } from '../terrain/model';
import { WATER_STEPS, type TerrainPalette } from './terrainPalette';
import { mapToScreen, tileCorners } from './projection';
import { fillPolygon, strokeLine } from './shapes';
import { strokePixelLine } from './pixelArt';

// Each side of a tile as the pair of corners it joins, plus the neighbour it
// faces: north side runs N-E, east side E-S, south side S-W, west side W-N.
const SIDES = [
  { dx: 0, dy: -1, from: [0, 0], to: [1, 0] },
  { dx: 1, dy: 0, from: [1, 0], to: [1, 1] },
  { dx: 0, dy: 1, from: [1, 1], to: [0, 1] },
  { dx: -1, dy: 0, from: [0, 1], to: [0, 0] },
] as const;

export function paintWaterTile(
  ctx: CanvasRenderingContext2D,
  model: TerrainModel,
  x: number,
  y: number,
  palette: TerrainPalette,
): void {
  const level = model.surface[y]![x]!;
  // Distance 1 (touching land) uses step 0; far-from-shore tiles use the last.
  const step = Math.min(WATER_STEPS, Math.max(1, model.shore[y]![x]!)) - 1;
  fillPolygon(ctx, tileCorners(x, y, level), palette.water[step]!);

  if ((x + 2 * y) % 8 === 0) {
    ctx.save();
    ctx.beginPath();
    tileCorners(x, y, level).forEach(({ sx, sy }, index) => (
      index === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy)
    ));
    ctx.closePath();
    ctx.clip();
    ctx.globalAlpha = 0.65;
    const glint = palette.waterShore;
    strokePixelLine(
      ctx,
      mapToScreen(x + 0.2, y + 0.28, level),
      mapToScreen(x + 0.46, y + 0.28, level),
      glint,
    );
    ctx.restore();
  }

  // The shore line. Clipping to the tile keeps the stroke inside the water: a
  // stroke is centred on its line, so half of it would otherwise spill onto land.
  ctx.save();
  ctx.beginPath();
  tileCorners(x, y, level).forEach(({ sx, sy }, i) => (i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy)));
  ctx.closePath();
  ctx.clip();
  for (const side of SIDES) {
    const neighbourIsLand = model.terrain.water[y + side.dy]?.[x + side.dx] === false;
    if (!neighbourIsLand) continue;
    strokeLine(
      ctx,
      mapToScreen(x + side.from[0], y + side.from[1], level),
      mapToScreen(x + side.to[0], y + side.to[1], level),
      palette.waterShore,
      3,
    );
  }
  ctx.restore();
}
