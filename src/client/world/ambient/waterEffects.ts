import { hash2 } from '../buildings/random';
import type { RoadLayer } from '../roads/roadLayer';
import type { TerrainFace } from '../terrain/edges';
import type { TerrainModel } from '../terrain/model';
import type { Theme } from '../themes';
import { faceCorners, type Side } from '../render/faceGeometry';
import { mapToScreen, tileCorners } from '../render/projection';
import { waterTileEffectVisible } from './ambientLod';

export interface WaterTileEffect {
  x: number;
  y: number;
  level: number;
  shimmer: boolean;
  ripple: boolean;
  phase: number;
}

export interface WaterfallEffect {
  x: number;
  y: number;
  side: Side;
  face: TerrainFace;
  phase: number;
}

export type WaterSide = 'north' | 'east' | 'south' | 'west';

export interface BridgeFoamEffect {
  x: number;
  y: number;
  side: WaterSide;
  phase: number;
}

export interface WaterEffectScene {
  tiles: WaterTileEffect[];
  waterfalls: WaterfallEffect[];
  bridgeFoam: BridgeFoamEffect[];
}

const WATER_SIDES: { side: WaterSide; dx: number; dy: number }[] = [
  { side: 'north', dx: 0, dy: -1 },
  { side: 'east', dx: 1, dy: 0 },
  { side: 'south', dx: 0, dy: 1 },
  { side: 'west', dx: -1, dy: 0 },
] as const;

interface WaterEffectContext {
  save(): void;
  restore(): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  closePath(): void;
  clip(): void;
  stroke(): void;
  ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number): void;
  globalAlpha: number;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
}

export function buildWaterEffectScene(model: TerrainModel, roads: RoadLayer): WaterEffectScene {
  const tiles: WaterTileEffect[] = [];
  const waterfalls: WaterfallEffect[] = [];
  const bridgeFoam: BridgeFoamEffect[] = [];

  for (const { x, y } of model.order) {
    if (model.terrain.water[y]![x]) {
      if (roads.decks[y]![x]) continue;
      const shimmer = hash2(x, y, 910) < 0.28;
      const ripple = hash2(x, y, 911) < 0.08;
      if (shimmer || ripple) {
        tiles.push({
          x,
          y,
          level: model.surface[y]![x]!,
          shimmer,
          ripple,
          phase: hash2(x, y, 912) * Math.PI * 2,
        });
      }

      for (const neighbor of WATER_SIDES) {
        if (!roads.decks[y + neighbor.dy]?.[x + neighbor.dx]) continue;
        bridgeFoam.push({ x, y, side: neighbor.side, phase: hash2(x, y, 913 + WATER_SIDES.indexOf(neighbor)) });
      }
    }

    const faces = model.faces[y]![x]!;
    if (faces.south?.kind === 'cascade') {
      waterfalls.push({ x, y, side: 'south', face: faces.south, phase: hash2(x, y, 917) });
    }
    if (faces.east?.kind === 'cascade') {
      waterfalls.push({ x, y, side: 'east', face: faces.east, phase: hash2(x, y, 918) });
    }
  }
  return { tiles, waterfalls, bridgeFoam };
}

function clipTile(ctx: WaterEffectContext, x: number, y: number, level: number): void {
  ctx.beginPath();
  for (const [index, corner] of tileCorners(x, y, level).entries()) {
    if (index === 0) ctx.moveTo(corner.sx, corner.sy);
    else ctx.lineTo(corner.sx, corner.sy);
  }
  ctx.closePath();
  ctx.clip();
}

function paintWaterTileEffects(
  ctx: WaterEffectContext,
  effect: WaterTileEffect,
  theme: Theme,
  time: number,
  animated: boolean,
): void {
  if (theme.water.frozen) return;
  const progress = animated ? (time / 2600 + effect.phase) % 1 : effect.phase;
  ctx.save();
  clipTile(ctx, effect.x, effect.y, effect.level);
  ctx.strokeStyle = theme.water.reflection;
  ctx.lineWidth = 1.2;
  if (effect.shimmer) {
    ctx.globalAlpha = animated ? 0.16 : 0.1;
    const centre = mapToScreen(effect.x + 0.5, effect.y + 0.5, effect.level);
    const sx = centre.sx + (progress - 0.5) * 11;
    const sy = centre.sy + Math.sin(progress * Math.PI * 2) * 1.5;
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy);
    ctx.lineTo(sx + 3, sy);
    ctx.stroke();
  }
  if (theme.id === 'rainy-evening' && effect.ripple) {
    ctx.globalAlpha = animated ? 0.12 : 0.08;
    const centre = mapToScreen(effect.x + 0.5, effect.y + 0.5, effect.level);
    const radius = 2 + progress * 3;
    ctx.beginPath();
    ctx.ellipse(centre.sx, centre.sy, radius, radius * 0.42, 0, 0.2, Math.PI * 1.7);
    ctx.stroke();
  }
  ctx.restore();
}

function paintWaterfall(
  ctx: WaterEffectContext,
  effect: WaterfallEffect,
  theme: Theme,
  time: number,
  animated: boolean,
): void {
  const corners = faceCorners(effect.x, effect.y, effect.side, effect.face);
  const progress = animated ? (time / 1100 + effect.phase) % 1 : effect.phase;
  ctx.save();
  ctx.beginPath();
  for (const [index, corner] of corners.entries()) {
    if (index === 0) ctx.moveTo(corner.sx, corner.sy);
    else ctx.lineTo(corner.sx, corner.sy);
  }
  ctx.closePath();
  ctx.clip();
  ctx.globalAlpha = animated ? 0.38 : 0.18;
  ctx.strokeStyle = theme.water.reflection;
  ctx.lineWidth = 1;
  for (let index = 0; index < 3; index++) {
    const across = (index + 1) / 4;
    const start = (progress + index / 3) % 1;
    const end = Math.min(1, start + 0.2);
    const from = {
      sx: corners[0]!.sx + (corners[1]!.sx - corners[0]!.sx) * across,
      sy: corners[0]!.sy + (corners[1]!.sy - corners[0]!.sy) * across,
    };
    const to = {
      sx: corners[3]!.sx + (corners[2]!.sx - corners[3]!.sx) * across,
      sy: corners[3]!.sy + (corners[2]!.sy - corners[3]!.sy) * across,
    };
    const point = (fraction: number) => ({
      sx: from.sx + (to.sx - from.sx) * fraction,
      sy: from.sy + (to.sy - from.sy) * fraction,
    });
    const a = point(start);
    const b = point(end);
    ctx.beginPath();
    ctx.moveTo(a.sx, a.sy);
    ctx.lineTo(b.sx, b.sy);
    ctx.stroke();
  }
  ctx.restore();
}

function paintBridgeFoam(
  ctx: WaterEffectContext,
  effect: BridgeFoamEffect,
  model: TerrainModel,
  theme: Theme,
  time: number,
  animated: boolean,
): void {
  const level = model.surface[effect.y]![effect.x]!;
  const corners = tileCorners(effect.x, effect.y, level);
  const fromTo = {
    north: [corners[0]!, corners[1]!],
    east: [corners[1]!, corners[2]!],
    south: [corners[2]!, corners[3]!],
    west: [corners[3]!, corners[0]!],
  }[effect.side];
  const progress = animated ? (time / 1700 + effect.phase) % 1 : effect.phase;
  ctx.save();
  clipTile(ctx, effect.x, effect.y, level);
  ctx.strokeStyle = theme.water.reflection;
  ctx.globalAlpha = animated ? 0.28 : 0.14;
  ctx.lineWidth = 1;
  for (let index = 0; index < 2; index++) {
    const t = (progress + index * 0.5) % 1;
    const x = fromTo[0].sx + (fromTo[1].sx - fromTo[0].sx) * t;
    const y = fromTo[0].sy + (fromTo[1].sy - fromTo[0].sy) * t;
    ctx.beginPath();
    ctx.moveTo(x - 1, y - 0.5);
    ctx.lineTo(x + 1, y + 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

export function paintWaterEffects(
  ctx: WaterEffectContext,
  scene: WaterEffectScene,
  model: TerrainModel,
  theme: Theme,
  time: number,
  animated: boolean,
  cameraZoom: number,
): void {
  for (const tile of scene.tiles) {
    if (waterTileEffectVisible(tile.x, tile.y, cameraZoom)) {
      paintWaterTileEffects(ctx, tile, theme, time, animated);
    }
  }
  for (const fall of scene.waterfalls) paintWaterfall(ctx, fall, theme, time, animated);
  if (!theme.water.frozen) {
    for (const foam of scene.bridgeFoam) paintBridgeFoam(ctx, foam, model, theme, time, animated);
  }
}
