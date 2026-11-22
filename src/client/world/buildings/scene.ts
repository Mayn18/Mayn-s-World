// Puts buildings on the terrain: where each is anchored, in what order it is drawn,
// and the shadows it casts.
//
// DEPTH
// The terrain is drawn tile by tile from far to near. A building is drawn when the
// painter reaches the tile at its south-east corner (the nearest tile of its
// footprint), so everything behind it is already down, and anything nearer drawn
// later covers its base correctly.
//
// SHADOWS
// Light comes from the upper left, so shadows fall toward the lower right (east on
// the map). Each building casts a plain rectangle of shade off its east side, as long
// as the ground there is dry, at the building's own level, and not under a building.
import type { Building } from '../data/buildings';
import type { TerrainModel } from '../terrain/model';
import { mapToScreen } from '../render/projection';
import { type TerrainPalette, mix } from '../render/terrainPalette';
import { type Theme } from '../themes';
import { CASTLE_KINDS, WALL_HEIGHT, castleHeight, paintCastlePiece, paintWallTile } from './castle';
import { type Origin } from './geometry';
import { type BuildingPalette, buildingPalette } from './palette';
import { paintBuilding, roofHeightAt } from './painter';
import { appearanceForTown } from './styles';
import { SPECIAL_KINDS, paintSpecial, specialHeight } from './specials';
import type { Appearance } from './style';
import type { DecorLayer } from '../decor/layer';

export interface WallRun {
  points: [number, number][];
}

export interface Placement {
  building: Building;
  origin: Origin;
  height: number;
  appearance: Appearance | null;
}

export interface WallTile {
  x: number;
  y: number;
  along: 'x' | 'y';
}

// A shadow's span across one tile, in tile-local x. `head` is the caster side and
// `tail` the far end, so the two stepped edges fade along the whole shadow rather
// than at every tile boundary.
interface ShadowSpan {
  x0: number;
  x1: number;
  head: boolean;
  tail: boolean;
}

export interface Scene {
  placements: Placement[];
  walls: WallTile[];
  // Highest point of the picture a building reaches, in projection space.
  top: number;
  // Draws anything that belongs to tile (x, y) once its ground is down.
  paintTile(ctx: CanvasRenderingContext2D, x: number, y: number, theme: Theme): void;
}

function peakHeight(app: Appearance): number {
  let h = 0;
  for (const v of app.volumes) {
    h = Math.max(h, roofHeightAt(app, v, (v.x0 + v.x1) / 2, (v.y0 + v.y1) / 2));
  }
  // chimneys, signs, masts and domes poke above the roof
  return h + 14;
}

const key = (x: number, y: number) => y * 1000 + x;

// Merge overlapping spans inside one tile so a pixel is painted once. The head and
// tail flags survive if any contributing caster has them, which keeps the soft
// edges continuous without double-darkening the overlap.
function mergeShadowSpans(spans: readonly ShadowSpan[]): ShadowSpan[] {
  const sorted = [...spans].sort((a, b) => a.x0 - b.x0);
  const merged: ShadowSpan[] = [];
  for (const span of sorted) {
    const last = merged[merged.length - 1];
    if (last && span.x0 <= last.x1 + 1e-6) {
      last.x1 = Math.max(last.x1, span.x1);
      last.head ||= span.head;
      last.tail ||= span.tail;
    } else {
      merged.push({ ...span });
    }
  }
  return merged;
}

// Tiles on the curtain wall's polylines (axis-aligned).
export function wallTiles(runs: WallRun[]): WallTile[] {
  const out = new Map<number, WallTile>();
  for (const { points } of runs) {
    for (let i = 0; i + 1 < points.length; i++) {
      const [x0, y0] = points[i]!;
      const [x1, y1] = points[i + 1]!;
      const along = y0 === y1 ? 'x' : 'y';
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
        for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) out.set(key(x, y), { x, y, along });
      }
    }
  }
  return [...out.values()];
}

export function buildScene(
  model: TerrainModel,
  buildings: Building[],
  walls: WallRun[],
  only?: ReadonlySet<number>,
  decor?: DecorLayer,
): Scene {
  const levels = model.terrain.levels;
  const chosen = only ? buildings.filter((b) => only.has(b.id)) : buildings;
  const allAppearances = appearanceForTown(buildings);

  const placements: Placement[] = chosen.map((b) => {
    const level = levels[b.y]![b.x]!;
    const castle = CASTLE_KINDS.includes(b.kind);
    const special = SPECIAL_KINDS.includes(b.kind);
    const appearance = castle || special ? null : allAppearances.get(b.id) ?? null;
    const height = castle ? castleHeight(b) : special ? specialHeight(b) : peakHeight(appearance!);
    return { building: b, origin: { x: b.x, y: b.y, level }, height, appearance };
  });

  const wallList = only && !only.has(7) ? [] : wallTiles(walls);

  // Tiles under a building take no shadow.
  const covered = new Set<number>();
  for (const { building: b } of placements) {
    for (let y = b.y; y < b.y + b.d; y++) for (let x = b.x; x < b.x + b.w; x++) covered.add(key(x, y));
  }
  for (const t of wallList) covered.add(key(t.x, t.y));

  // Shadow spans by tile. Built for one theme at a time: a theme switch rebuilds
  // the cache, so only the current theme's small map is retained.
  const casters: { x: number; y: number; w: number; d: number; height: number; level: number }[] = [];
  for (const p of placements) {
    casters.push({ x: p.building.x, y: p.building.y, w: p.building.w, d: p.building.d, height: p.height, level: p.origin.level });
  }
  for (const t of wallList) {
    casters.push({ x: t.x, y: t.y, w: 1, d: 1, height: WALL_HEIGHT * 2.2, level: levels[t.y]![t.x]! });
  }

  const buildShadowMap = (theme: Theme) => {
    const out = new Map<number, ShadowSpan[]>();
    for (const caster of casters) {
      const baseLength = Math.min(2.6, Math.max(0.7, caster.height / 22));
      const length = Math.min(3.5, baseLength * theme.shadow.lengthScale);
      const { x: x0, y: y0, w, d, level } = caster;
      const from = x0 + w;
      const to = from + length;
      const firstTile = Math.floor(from);
      const lastTile = Math.ceil(to) - 1;
      for (let y = y0; y < y0 + d; y++) {
        for (let x = firstTile; x <= lastTile; x++) {
          if (x < 0 || y < 0 || x >= model.terrain.width || y >= model.terrain.height) continue;
          if (levels[y]![x] !== level || model.terrain.water[y]![x] || covered.has(key(x, y))) continue;
          const lx0 = Math.max(from, x) - x;
          const lx1 = Math.min(to, x + 1) - x;
          if (lx1 <= lx0) continue;
          const list = out.get(key(x, y)) ?? [];
          list.push({ x0: lx0, x1: lx1, head: x === firstTile, tail: x === lastTile });
          out.set(key(x, y), list);
        }
      }
    }
    return out;
  };

  let shadowTheme: Theme | null = null;
  let shadowMap: Map<number, ShadowSpan[]> | null = null;
  const shadowsFor = (theme: Theme) => {
    if (shadowTheme !== theme || !shadowMap) {
      shadowTheme = theme;
      shadowMap = buildShadowMap(theme);
    }
    return shadowMap;
  };

  const anchors = new Map<number, Placement[]>();
  for (const p of placements) {
    const k = key(p.building.x + p.building.w - 1, p.building.y + p.building.d - 1);
    anchors.set(k, [...(anchors.get(k) ?? []), p]);
  }
  const wallAt = new Map(wallList.map((t) => [key(t.x, t.y), t]));

  let top = Infinity;
  for (const p of placements) {
    const { building: b, origin: o } = p;
    top = Math.min(top, mapToScreen(b.x, b.y, o.level).sy - p.height - 12);
  }
  for (const t of wallList) top = Math.min(top, mapToScreen(t.x, t.y, levels[t.y]![t.x]!).sy - WALL_HEIGHT - 6);

  // Tall trees along the north edge reach above everything else.
  if (decor) {
    for (const [k, list] of decor.plan.plants) {
      const x = k % 1000;
      const y = Math.floor(k / 1000);
      for (const p of list) top = Math.min(top, mapToScreen(x + p.ox, y + p.oy, model.surface[y]![x]!).sy - 50 * p.s);
    }
  }

  const cache = new Map<Theme, BuildingPalette>();
  const paletteFor = (theme: Theme) => {
    let p = cache.get(theme);
    if (!p) cache.set(theme, (p = buildingPalette(theme)));
    return p;
  };

  return {
    placements,
    walls: wallList,
    top,
    paintTile(ctx, x, y, theme) {
      const pal = paletteFor(theme);
      decor?.paintGround(ctx, x, y, pal);
      const spans = shadowsFor(theme).get(key(x, y));
      if (spans) {
        const level = levels[y]![x]!;
        const q = (mx: number) => mapToScreen(x + mx, y, level);
        const fill = (a: number, c: number) => {
          if (c <= a) return;
          ctx.beginPath();
          [q(a), q(c), mapToScreen(x + c, y + 1, level), mapToScreen(x + a, y + 1, level)]
            .forEach((point, i) => (i ? ctx.lineTo(point.sx, point.sy) : ctx.moveTo(point.sx, point.sy)));
          ctx.closePath();
          ctx.fill();
        };
        ctx.save();
        ctx.fillStyle = theme.shadow.color;
        for (const span of mergeShadowSpans(spans)) {
          const length = span.x1 - span.x0;
          if (theme.shadow.edgeSteps === 1) {
            ctx.globalAlpha = theme.shadow.opacity;
            fill(span.x0, span.x1);
          } else if (span.head && span.tail) {
            // A short shadow that starts and ends inside this tile: dark at the
            // caster, lighter at the far end.
            const middle = span.x0 + length * 0.5;
            ctx.globalAlpha = theme.shadow.opacity;
            fill(span.x0, middle);
            ctx.globalAlpha = theme.shadow.opacity * 0.35;
            fill(middle, span.x1);
          } else if (span.head) {
            const headEnd = span.x0 + length * 0.35;
            ctx.globalAlpha = theme.shadow.opacity;
            fill(span.x0, headEnd);
            ctx.globalAlpha = theme.shadow.opacity * 0.65;
            fill(headEnd, span.x1);
          } else if (span.tail) {
            const tailStart = span.x1 - length * 0.35;
            ctx.globalAlpha = theme.shadow.opacity * 0.65;
            fill(span.x0, tailStart);
            ctx.globalAlpha = theme.shadow.opacity * 0.35;
            fill(tailStart, span.x1);
          } else {
            ctx.globalAlpha = theme.shadow.opacity * 0.65;
            fill(span.x0, span.x1);
          }
        }
        ctx.restore();
      }
      const wall = wallAt.get(key(x, y));
      if (wall) paintWallTile(ctx, { x, y, level: levels[y]![x]! }, wall.along, pal);
      for (const p of anchors.get(key(x, y)) ?? []) {
        if (p.appearance) paintBuilding(ctx, p.origin, p.building, p.appearance, pal, p.building.id);
        else if (SPECIAL_KINDS.includes(p.building.kind)) paintSpecial(ctx, p.origin, p.building, pal);
        else paintCastlePiece(ctx, p.origin, p.building, pal);
      }
      decor?.paintStanding(ctx, x, y, pal);
    },
  };
}

// The buildings shown for the first art-direction review: one of each kind of thing
// the town needs to prove, plus the castle. Everything else comes after approval.
export const REVIEW_IDS: ReadonlySet<number> = new Set([
  0, 1, 2, 3, 4, 5, // the six destinations
  17, 47, 58, // the cathedral and typical residential
  43, 44, 45, 62, 63, 84, // larger commercial
  7, 8, 9, 10, 11, 12, 13, 14, 15, 27, 28, 26, // the castle and its gatehouses
]);

void mix;
export type { TerrainPalette };
