import type { BuildingPalette } from '../buildings/palette';
import type { Scene, ScenePaintOptions } from '../buildings/scene';
import type { TerrainPalette } from '../render/terrainPalette';
import { paintTerrainFace } from '../render/terrainPainter';
import type { Theme } from '../themes';
import type { TerrainModel } from '../terrain/model';
import { mapToScreen } from '../render/projection';
import { paintProp, paintVillager } from '../decor/props';
import { tileKey } from '../decor/plan';
import type { AmbientScene, FlagAnchor, RoutePoint, SmokeAnchor } from './ambientScene';
import { updateWalkerPosition } from './ambientScene';
import type { WaterEffectScene } from './waterEffects';
import { paintWaterEffects } from './waterEffects';

const STATIC_SMOKE = [
  [2, -4, 1.9, 0.5],
  [4.5, -9, 2.4, 0.36],
  [8, -14, 2.9, 0.24],
] as const;

function paintSmoke(
  ctx: CanvasRenderingContext2D,
  anchor: SmokeAnchor,
  palette: BuildingPalette,
  time: number,
  animated: boolean,
): void {
  ctx.save();
  if (!animated) {
    for (const [dx, dy, radius, alpha] of STATIC_SMOKE) {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(anchor.sx + dx, anchor.sy + dy, radius, 0, Math.PI * 2);
      ctx.fillStyle = palette.white;
      ctx.fill();
    }
  } else {
    const cycle = (time / 3200 + anchor.phase) % 1;
    for (let index = 0; index < 3; index++) {
      const age = (cycle + index / 3) % 1;
      ctx.globalAlpha = (1 - age) * 0.32;
      ctx.beginPath();
      ctx.arc(
        anchor.sx + 1 + age * 5,
        anchor.sy - 2 - age * 15,
        1.6 + age * 1.3,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = palette.white;
      ctx.fill();
    }
  }
  ctx.restore();
}

function paintFlag(ctx: CanvasRenderingContext2D, anchor: FlagAnchor, palette: BuildingPalette, time: number, animated: boolean): void {
  const top = anchor.sy - anchor.height;
  const wave = animated ? Math.sin(time / 740 + anchor.phase) * 1.2 : 0;
  const mid = anchor.kind === 'building' ? 13 : anchor.height - 2.5;
  const bottom = anchor.kind === 'building' ? 10.5 : anchor.height - 5.5;
  ctx.fillStyle = palette.m.awnRed.lit;
  ctx.beginPath();
  ctx.moveTo(anchor.sx, top);
  ctx.lineTo(anchor.sx + 8, anchor.sy - mid + wave);
  ctx.lineTo(anchor.sx, anchor.sy - bottom);
  ctx.closePath();
  ctx.fill();
}

function paintCloudShadows(
  ctx: CanvasRenderingContext2D,
  scene: AmbientScene,
  model: TerrainModel,
  theme: Theme,
  time: number,
  animated: boolean,
): void {
  ctx.save();
  ctx.fillStyle = theme.shadow.color;
  ctx.globalAlpha = 0.08;
  for (const cloud of scene.clouds) {
    const cx = cloud.x + (animated ? Math.sin(time / 17000 + cloud.phase) * 2.3 : 0);
    const cy = cloud.y + (animated ? Math.cos(time / 21000 + cloud.phase) * 1.2 : 0);
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = Math.floor(cx) + dx;
        const y = Math.floor(cy) + dy;
        if (!scene.cloudSafeTiles[y]?.[x]) continue;
        const u = (x + 0.5 - cx) / 4.2;
        const v = (y + 0.5 - cy) / 3.2;
        if (u * u + v * v > 1) continue;
        const level = model.surface[y]![x]!;
        const north = mapToScreen(x, y, level);
        const east = mapToScreen(x + 1, y, level);
        const south = mapToScreen(x + 1, y + 1, level);
        const west = mapToScreen(x, y + 1, level);
        ctx.beginPath();
        ctx.moveTo(north.sx, north.sy);
        ctx.lineTo(east.sx, east.sy);
        ctx.lineTo(south.sx, south.sy);
        ctx.lineTo(west.sx, west.sy);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

function paintActorOcclusion(
  ctx: CanvasRenderingContext2D,
  position: RoutePoint,
  ambientScene: AmbientScene,
  scene: Scene,
  model: TerrainModel,
  theme: Theme,
  terrain: TerrainPalette,
  paintOptions: ScenePaintOptions,
): void {
  const actorDepth = position.x + position.y;
  const minX = Math.max(0, Math.floor(position.x) - 5);
  const maxX = Math.min(model.terrain.width - 1, Math.floor(position.x) + 5);
  const minY = Math.max(0, Math.floor(position.y) - 5);
  const maxY = Math.min(model.terrain.height - 1, Math.floor(position.y) + 5);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (x + y <= actorDepth || !ambientScene.occlusionTiles.has(tileKey(x, y))) continue;
      const faces = model.faces[y]![x]!;
      if (faces.south && faces.south.top > position.level) {
        paintTerrainFace(ctx, x, y, 'south', faces.south, terrain);
      }
      if (faces.east && faces.east.top > position.level) {
        paintTerrainFace(ctx, x, y, 'east', faces.east, terrain);
      }
      scene.paintTile(ctx, x, y, theme, paintOptions);
    }
  }
}

function paintActorBuffer(
  ctx: CanvasRenderingContext2D,
  buffer: HTMLCanvasElement,
  position: RoutePoint,
  paintActor: (ctx: CanvasRenderingContext2D) => void,
  ambientScene: AmbientScene,
  scene: Scene,
  model: TerrainModel,
  theme: Theme,
  terrain: TerrainPalette,
  paintOptions: ScenePaintOptions,
): void {
  const bufferCtx = buffer.getContext('2d');
  if (!bufferCtx) return;
  const foot = mapToScreen(position.x, position.y, position.level);
  bufferCtx.setTransform(1, 0, 0, 1, 0, 0);
  bufferCtx.globalCompositeOperation = 'source-over';
  bufferCtx.globalAlpha = 1;
  bufferCtx.clearRect(0, 0, buffer.width, buffer.height);
  bufferCtx.setTransform(1, 0, 0, 1, 32 - foot.sx, 54 - foot.sy);
  paintActor(bufferCtx);

  bufferCtx.globalCompositeOperation = 'destination-out';
  bufferCtx.globalAlpha = 1;
  paintActorOcclusion(bufferCtx, position, ambientScene, scene, model, theme, terrain, paintOptions);
  bufferCtx.globalCompositeOperation = 'source-over';
  ctx.drawImage(buffer, foot.sx - 32, foot.sy - 54);
}

function paintActors(
  ctx: CanvasRenderingContext2D,
  ambientScene: AmbientScene,
  buffers: HTMLCanvasElement[],
  scene: Scene,
  model: TerrainModel,
  theme: Theme,
  palette: BuildingPalette,
  terrain: TerrainPalette,
  paintOptions: ScenePaintOptions,
  time: number,
  animated: boolean,
  zoom: number,
): void {
  const moving = animated && zoom >= 1.55;
  let bufferIndex = 0;
  for (const walker of ambientScene.walkers) {
    const position = updateWalkerPosition(walker, time, moving);
    const origin = { x: position.x - 0.5, y: position.y - 0.5, level: position.level };
    const buffer = buffers[bufferIndex++];
    if (buffer) {
      paintActorBuffer(
        ctx,
        buffer,
        position,
        (actorCtx) => paintVillager(actorCtx, origin, 0.5, 0.5, walker.v, palette),
        ambientScene,
        scene,
        model,
        theme,
        terrain,
        paintOptions,
      );
    }
  }

  for (const animal of ambientScene.animals) {
    const sway = moving ? Math.sin(time / 1600 + animal.phase) * 0.07 : 0;
    const position = {
      x: animal.x + 0.5 + sway,
      y: animal.y + 0.5 + Math.cos(time / 2100 + animal.phase) * (moving ? 0.035 : 0),
      level: animal.level,
    };
    const origin = { x: position.x - 0.5, y: position.y - 0.5, level: position.level };
    const buffer = buffers[bufferIndex++];
    if (buffer) {
      paintActorBuffer(
        ctx,
        buffer,
        position,
        (actorCtx) => paintProp(actorCtx, origin, animal.kind, palette, animal.seed, (animal.x + animal.y) % 2 === 0),
        ambientScene,
        scene,
        model,
        theme,
        terrain,
        paintOptions,
      );
    }
  }
}

interface AmbientOverlayContext {
  save(): void;
  restore(): void;
  globalAlpha: number;
  fillStyle: string | CanvasGradient | CanvasPattern;
  fillRect(x: number, y: number, width: number, height: number): void;
}

export function paintFireflies(
  ctx: AmbientOverlayContext,
  scene: Pick<AmbientScene, 'fireflies'>,
  theme: Theme,
  time: number,
  animated: boolean,
  zoom: number,
): void {
  if (theme.id !== 'enchanted-forest') return;
  const count = Math.min(scene.fireflies.length, zoom < 1.35 ? 4 : zoom < 2 ? 12 : scene.fireflies.length);
  ctx.save();
  ctx.fillStyle = theme.accent.color;
  for (let index = 0; index < count; index++) {
    const firefly = scene.fireflies[index]!;
    const point = mapToScreen(firefly.x + firefly.ox, firefly.y + firefly.oy, firefly.level);
    ctx.globalAlpha = animated ? 0.28 + Math.sin(time / 1600 + firefly.phase) * 0.12 : 0.32;
    const drift = animated ? Math.sin(time / 2300 + firefly.phase) * 1.5 : 0;
    ctx.fillRect(point.sx + drift, point.sy - firefly.size * 15, 2, 2);
  }
  ctx.restore();
}

export function paintNightLights(
  ctx: AmbientOverlayContext,
  scene: Pick<AmbientScene, 'windows' | 'lamps'>,
  theme: Theme,
  time: number,
  animated: boolean,
): void {
  if (theme.id !== 'cozy-night') return;
  ctx.save();
  ctx.fillStyle = theme.emissive.windowColor;
  for (const window of scene.windows) {
    if (window.chance >= theme.emissive.windowFraction) continue;
    ctx.globalAlpha = animated ? 0.11 + Math.sin(time / 9000 + window.phase) * 0.035 : 0.12;
    ctx.fillRect(window.sx - 1, window.sy - 1, 2, 2.5);
  }
  ctx.fillStyle = theme.emissive.lampColor;
  for (const lamp of scene.lamps) {
    ctx.globalAlpha = animated ? 0.2 + Math.sin(time / 11000 + lamp.phase) * 0.045 : 0.22;
    ctx.fillRect(lamp.sx - 1.5, lamp.sy - 1.5, 3, 3);
  }
  ctx.restore();
}

interface WeatherOverlayContext extends AmbientOverlayContext {
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
}

export function paintWeather(
  ctx: WeatherOverlayContext,
  scene: Pick<AmbientScene, 'particleSeeds'>,
  theme: Theme,
  time: number,
  animated: boolean,
  width: number,
  height: number,
  dpr: number,
  zoom: number,
  deviceFactor: number,
): void {
  const raining = theme.id === 'rainy-evening';
  const snowing = theme.id === 'snowy-cabin';
  if ((!raining && !snowing) || width <= 0 || height <= 0) return;
  const zoomFactor = 0.62 + Math.min(1, Math.max(0, zoom - 1) / 3) * 0.38;
  const desired = raining ? 110 : 74;
  const count = Math.min(scene.particleSeeds.x.length, Math.floor(desired * zoomFactor * deviceFactor));
  const elapsed = animated ? time : 0;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (raining) {
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = theme.colors.cloud;
    ctx.lineWidth = 0.8;
    for (let index = 0; index < count; index++) {
      const speed = scene.particleSeeds.speed[index]!;
      const x = (scene.particleSeeds.x[index]! * width + elapsed * 0.025 * speed) % width;
      const y = (scene.particleSeeds.y[index]! * height + elapsed * 0.075 * speed) % height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y + 8);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = theme.colors.cloud;
    for (let index = 0; index < count; index++) {
      const speed = scene.particleSeeds.speed[index]!;
      const phase = scene.particleSeeds.phase[index]!;
      const x = ((
        scene.particleSeeds.x[index]! * width
        + Math.sin(elapsed / 1400 + phase) * 10
      ) % width + width) % width;
      const y = (scene.particleSeeds.y[index]! * height + elapsed * 0.018 * speed) % height;
      ctx.globalAlpha = 0.38 + Math.sin(elapsed / 1800 + phase) * 0.12;
      ctx.fillRect(x, y, 1.6, 1.6);
    }
  }
  ctx.restore();
}

export function paintAmbientBase(
  ctx: CanvasRenderingContext2D,
  scene: AmbientScene,
  water: WaterEffectScene,
  staticScene: Scene,
  model: TerrainModel,
  theme: Theme,
  palette: BuildingPalette,
  terrain: TerrainPalette,
  actorBuffers: HTMLCanvasElement[],
  paintOptions: ScenePaintOptions,
  time: number,
  animated: boolean,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
  dpr: number,
  deviceFactor: number,
): void {
  paintWaterEffects(ctx, water, model, theme, time, animated);
  paintCloudShadows(ctx, scene, model, theme, time, animated);
  paintFireflies(ctx, scene, theme, time, animated, zoom);
  paintNightLights(ctx, scene, theme, time, animated);
  if (zoom >= 1.35 || !animated) {
    for (const smoke of scene.smoke) paintSmoke(ctx, smoke, palette, time, animated && zoom >= 1.35);
  }
  for (const flag of scene.flags) paintFlag(ctx, flag, palette, time, animated);
  paintActors(ctx, scene, actorBuffers, staticScene, model, theme, palette, terrain, paintOptions, time, animated, zoom);
  paintWeather(ctx, scene, theme, time, animated, viewportWidth, viewportHeight, dpr, zoom, deviceFactor);
}
