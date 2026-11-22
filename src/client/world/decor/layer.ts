// The environment layer: everything that is not a building, road or terrain. It is
// built once from the map data and then asked, tile by tile, to paint what belongs on
// that tile, so the scene can interleave it with buildings in the right depth order.
//
//   paintGround    flat things lying on the ground: crop rows, garden beds
//   paintStanding  things with height: fences, props, plants and villagers
//
// Within a tile the order is: ground, then (scene) shadows and buildings, then standing
// things, sorted back to front by their position inside the tile.
import type { Building } from '../data/buildings';
import { FIELD_CROPS, FIELD_STRAW, FIELD_WHEAT, type DecorData } from '../data/decor';
import type { BuildingPalette } from '../buildings/palette';
import type { Origin } from '../buildings/geometry';
import { hash2 } from '../buildings/random';
import { mapToScreen } from '../render/projection';
import { mix } from '../render/terrainPalette';
import type { RoadLayer } from '../roads/roadLayer';
import type { TerrainModel } from '../terrain/model';
import { type DecorPlan, planDecor, tileKey } from './plan';
import { paintPlant } from './plants';
import { type FenceSeg, paintBareWellYard, paintCropRows, paintFence, paintKitchenYard, paintProp, paintVillager, paintWoodpileShedYard } from './props';

export interface DecorLayer {
  plan: DecorPlan;
  paintGround(ctx: CanvasRenderingContext2D, x: number, y: number, pal: BuildingPalette): void;
  paintStanding(ctx: CanvasRenderingContext2D, x: number, y: number, pal: BuildingPalette): void;
}

// Fence edges, owned by the tile whose edge they lie on. A road crossing a fence line
// leaves a gap, which is the gate.
export function fenceSegments(
  fences: DecorData['fences'],
  isRoad: (x: number, y: number) => boolean,
): Map<number, FenceSeg[]> {
  const out = new Map<number, FenceSeg[]>();
  const add = (x: number, y: number, seg: FenceSeg) => {
    const list = out.get(tileKey(x, y)) ?? [];
    list.push(seg);
    out.set(tileKey(x, y), list);
  };
  for (const [x, y, w, d] of fences) {
    for (let i = x; i < x + w; i++) {
      if (!isRoad(i, y)) add(i, y, { axis: 'x', at: 0 });
      if (!isRoad(i, y + d - 1)) add(i, y + d - 1, { axis: 'x', at: 1 });
    }
    for (let j = y; j < y + d; j++) {
      if (!isRoad(x, j)) add(x, j, { axis: 'y', at: 0 });
      if (!isRoad(x + w - 1, j)) add(x + w - 1, j, { axis: 'y', at: 1 });
    }
  }
  return out;
}

export function buildDecorLayer(
  model: TerrainModel,
  roads: RoadLayer,
  buildings: Building[],
  walls: { points: [number, number][] }[],
  data: DecorData,
): DecorLayer {
  const plan = planDecor(model, roads, buildings, walls, data);
  const isRoad = (x: number, y: number) => model.terrain.roads[y]?.[x] === true;
  const fences = fenceSegments(data.fences, isRoad);
  const props = new Map<number, DecorData['props']>();
  for (const p of data.props) props.set(tileKey(p.x, p.y), [...(props.get(tileKey(p.x, p.y)) ?? []), p]);
  const bedYards = new Map<number, (typeof data.yards)[number]>();
  for (const yd of data.yards) {
    for (let j = yd.y; j < yd.y + yd.d; j++) {
      for (let i = yd.x; i < yd.x + yd.w; i++) bedYards.set(tileKey(i, j), yd);
    }
  }

  const origin = (x: number, y: number): Origin => ({ x, y, level: model.surface[y]![x]! });
  const paved = (x: number, y: number) => isRoad(x, y) || roads.plaza[y]![x]! || roads.decks[y]![x]! || model.terrain.water[y]![x]!;

  return {
    plan,
    paintGround(ctx, x, y, pal) {
      const o = origin(x, y);
      const field = data.fields[y]![x]!;
      if (field !== 0 && !paved(x, y) && !bedYards.has(tileKey(x, y))) {
        if (field === FIELD_WHEAT) paintCropRows(ctx, o, mix(pal.m.roofThatch.lit, pal.leafLight, 0.2), mix(pal.m.roofThatch.dark, pal.m.roofThatch.lit, 0.4), 5);
        else if (field === FIELD_CROPS) paintCropRows(ctx, o, mix(pal.woodDark, pal.leaf, 0.3), mix(pal.leaf, pal.leafLight, 0.5), 4);
        else if (field === FIELD_STRAW) paintCropRows(ctx, o, mix(pal.m.roofThatch.light, pal.leafLight, 0.35), mix(pal.m.roofThatch.lit, pal.leafLight, 0.5), 3);
      }
      const yard = bedYards.get(tileKey(x, y));
      if (yard && !paved(x, y)) {
        const type = hash2(yard.of, yard.x + yard.y, 247);
        if (type < 1 / 3) paintKitchenYard(ctx, o, pal, hash2(x, y, 248));
        else if (type < 2 / 3) paintWoodpileShedYard(ctx, o, pal, hash2(x, y, 249));
        else paintBareWellYard(ctx, o, pal, hash2(x, y, 250));
      }
    },
    paintStanding(ctx, x, y, pal) {
      const k = tileKey(x, y);
      const o = origin(x, y);
      for (const seg of fences.get(k) ?? []) paintFence(ctx, o, seg, pal);
      for (const p of props.get(k) ?? []) {
        // Benches face the square or street they stand beside: along x when the tile to the
        // south is open, otherwise along y.
        paintProp(ctx, o, p.t, pal, hash2(x, y, 80), (x + y) % 2 === 0);
      }
      type Standing = { oy: number; draw: () => void };
      const list: Standing[] = [];
      for (const pl of plan.plants.get(k) ?? []) {
        const base = mapToScreen(x + pl.ox, y + pl.oy, o.level);
        list.push({ oy: pl.oy, draw: () => paintPlant(ctx, { sx: base.sx, sy: base.sy }, pl.kind, pl.v, pl.s, pal) });
      }
      for (const f of plan.figures.get(k) ?? []) list.push({ oy: f.oy, draw: () => paintVillager(ctx, o, f.ox, f.oy, f.v, pal) });
      list.sort((a, b) => a.oy - b.oy).forEach((s) => s.draw());
    },
  };
}
