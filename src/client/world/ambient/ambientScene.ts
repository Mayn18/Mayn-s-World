import { castleBannerAnchors, CASTLE_KINDS } from '../buildings/castle';
import { buildingFlagAnchors, buildingWindowAnchors, chimneyAnchors } from '../buildings/painter';
import type { Scene } from '../buildings/scene';
import { propKey, type DecorData, type Prop } from '../data/decor';
import type { PlantKind } from '../decor/plants';
import { hash2 } from '../buildings/random';
import type { RoadLayer } from '../roads/roadLayer';
import { tileKey, type PlacedFigure } from '../decor/plan';
import { mapToScreen } from '../render/projection';
import type { TerrainModel } from '../terrain/model';

export interface SmokeAnchor {
  sx: number;
  sy: number;
  seed: number;
  phase: number;
}

export interface FlagAnchor {
  sx: number;
  sy: number;
  height: number;
  kind: 'building' | 'banner';
  phase: number;
}

export interface CloudAnchor {
  x: number;
  y: number;
  phase: number;
}

export interface RoutePoint {
  x: number;
  y: number;
  level: number;
}

export interface WalkerAnchor {
  tileKey: number;
  x: number;
  y: number;
  ox: number;
  oy: number;
  v: number;
  route: RoutePoint[];
  current: RoutePoint;
  routeLength: number;
  speed: number;
  pause: number;
  phase: number;
}

export interface AnimalAnchor {
  propId: string;
  kind: 'sheep' | 'cow';
  x: number;
  y: number;
  level: number;
  phase: number;
  seed: number;
}

export interface LightAnchor {
  sx: number;
  sy: number;
  chance: number;
  phase: number;
}

export interface FireflyAnchor {
  x: number;
  y: number;
  ox: number;
  oy: number;
  level: number;
  size: number;
  phase: number;
}

export interface ParticleSeeds {
  x: Float32Array;
  y: Float32Array;
  speed: Float32Array;
  phase: Float32Array;
}

export interface AmbientScene {
  smoke: SmokeAnchor[];
  flags: FlagAnchor[];
  clouds: CloudAnchor[];
  cloudSafeTiles: boolean[][];
  walkers: WalkerAnchor[];
  animals: AnimalAnchor[];
  movingFigureTiles: ReadonlySet<number>;
  movingAnimalPropIds: ReadonlySet<string>;
  occlusionTiles: ReadonlySet<number>;
  windows: LightAnchor[];
  lamps: LightAnchor[];
  fireflies: FireflyAnchor[];
  particleSeeds: ParticleSeeds;
}

export function staticCachePaintOptions(scene: AmbientScene): {
  animatedStatic: false;
  movingFigureTiles: ReadonlySet<number>;
  movingAnimalPropIds: ReadonlySet<string>;
} {
  return {
    animatedStatic: false,
    movingFigureTiles: scene.movingFigureTiles,
    movingAnimalPropIds: scene.movingAnimalPropIds,
  };
}

function roadRoute(
  model: TerrainModel,
  roads: RoadLayer,
  startX: number,
  startY: number,
  figure: PlacedFigure,
): RoutePoint[] {
  const { width, height } = model.terrain;
  const start = startY * width + startX;
  const distance = new Int16Array(width * height);
  const parent = new Int32Array(width * height);
  const queue = new Int32Array(width * height);
  distance.fill(-1);
  parent.fill(-1);
  distance[start] = 0;
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  const walkable = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height || model.terrain.water[y]![x]) return false;
    const tile = model.terrain.roadTiles[y]![x];
    return roads.plaza[y]![x]! || (!!tile && tile.kind !== 'path' && tile.kind !== 'pier');
  };
  const offsets = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

  while (head < tail) {
    const current = queue[head++]!;
    const x = current % width;
    const y = Math.floor(current / width);
    for (const [dx, dy] of offsets) {
      const nx = x + dx;
      const ny = y + dy;
      if (!walkable(nx, ny)) continue;
      const next = ny * width + nx;
      if (distance[next] !== -1) continue;
      distance[next] = distance[current]! + 1;
      parent[next] = current;
      queue[tail++] = next;
    }
  }

  let target = start;
  let targetRank = -1;
  let furthest = start;
  for (let id = 0; id < distance.length; id++) {
    const steps = distance[id]!;
    if (steps > distance[furthest]!) furthest = id;
    if (steps < 5 || steps > 14) continue;
    const rank = hash2(id, start, 940);
    if (rank > targetRank) {
      targetRank = rank;
      target = id;
    }
  }
  if (target === start) target = furthest;
  if (target === start || distance[target]! < 2) return [];

  const ids = [target];
  for (let current = target; current !== start;) {
    current = parent[current]!;
    if (current < 0) return [];
    ids.push(current);
  }
  ids.reverse();
  return ids.map((id, index) => {
    const x = id % width;
    const y = Math.floor(id / width);
    return {
      x: index === 0 ? x + figure.ox : x + 0.5,
      y: index === 0 ? y + figure.oy : y + 0.5,
      level: model.surface[y]![x]!,
    };
  });
}

function isAnimal(prop: Prop): prop is Prop & { t: 'sheep' | 'cow' } {
  return prop.t === 'sheep' || prop.t === 'cow';
}

export function buildAmbientScene(
  model: TerrainModel,
  roads: RoadLayer,
  scene: Scene,
  decorData: DecorData,
): AmbientScene {
  const smoke: SmokeAnchor[] = [];
  const flags: FlagAnchor[] = [];
  const windows: LightAnchor[] = [];
  const lamps: LightAnchor[] = [];
  for (const placement of scene.placements) {
    const seed = placement.building.id;
    if (placement.appearance) {
      for (const [index, anchor] of chimneyAnchors(placement.origin, placement.appearance, seed).entries()) {
        smoke.push({
          sx: anchor.point.sx,
          sy: anchor.point.sy,
          seed: anchor.seed,
          phase: hash2(seed, index, 731),
        });
      }
      for (const [index, anchor] of buildingFlagAnchors(placement.origin, placement.appearance).entries()) {
        flags.push({
          sx: anchor.base.sx,
          sy: anchor.base.sy,
          height: anchor.height,
          kind: 'building',
          phase: hash2(seed, index, 733),
        });
      }
      for (const anchor of buildingWindowAnchors(placement.origin, placement.building, placement.appearance)) {
        windows.push({
          sx: anchor.point.sx,
          sy: anchor.point.sy,
          chance: anchor.chance,
          phase: anchor.phase,
        });
      }
    } else if (CASTLE_KINDS.includes(placement.building.kind)) {
      for (const [index, anchor] of castleBannerAnchors(placement.origin, placement.building).entries()) {
        flags.push({
          sx: anchor.tip.sx,
          sy: anchor.tip.sy,
          height: anchor.height,
          kind: 'banner',
          phase: hash2(seed, index, 734),
        });
      }
    }
  }

  const { width, height, water, roadTiles } = model.terrain;
  const decorPlan = scene.decor?.plan;
  const cloudSafeTiles = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => {
      const key = tileKey(x, y);
      return !water[y]![x]!
        && !roadTiles[y]![x]
        && !roads.plaza[y]![x]!
        && !roads.decks[y]![x]!
        && decorData.fields[y]![x] === 0
        && !decorPlan?.taken[y]![x]
        && !decorPlan?.plants.has(key);
    }),
  );

  const clouds: CloudAnchor[] = [];
  const zones = [
    { x0: 0, x1: Math.floor(width / 3), y0: Math.floor(height * 0.25), y1: height - 2 },
    { x0: Math.floor(width / 3), x1: Math.floor((width * 2) / 3), y0: Math.floor(height * 0.45), y1: height - 2 },
    { x0: Math.floor((width * 2) / 3), x1: width - 2, y0: 2, y1: Math.floor(height * 0.7) },
  ];
  for (const [index, zone] of zones.entries()) {
    const candidates: { x: number; y: number }[] = [];
    for (let y = zone.y0; y <= zone.y1; y++) {
      for (let x = zone.x0; x <= zone.x1; x++) {
        if (cloudSafeTiles[y]![x]) candidates.push({ x, y });
      }
    }
    if (candidates.length === 0) continue;
    const selected = candidates[Math.floor(hash2(index, 0, 735) * candidates.length)]!;
    clouds.push({ ...selected, phase: hash2(index, 1, 736) * Math.PI * 2 });
  }

  const figureCandidates = [...(decorPlan?.figures.entries() ?? [])]
    .flatMap(([key, figures]) => figures.map((figure) => ({
      key,
      x: key % 1000,
      y: Math.floor(key / 1000),
      figure,
    })))
    .sort((a, b) => hash2(a.x, a.y, 939) - hash2(b.x, b.y, 939));
  const walkers: WalkerAnchor[] = [];
  for (const candidate of figureCandidates) {
    if (walkers.length >= 2) break;
    if (walkers.some((walker) => Math.abs(walker.x - candidate.x) + Math.abs(walker.y - candidate.y) < 8)) continue;
    const route = roadRoute(model, roads, candidate.x, candidate.y, candidate.figure);
    if (route.length < 2) continue;
    walkers.push({
      tileKey: candidate.key,
      x: candidate.x,
      y: candidate.y,
      ox: candidate.figure.ox,
      oy: candidate.figure.oy,
      v: candidate.figure.v,
      route,
      current: { ...route[0]! },
      routeLength: route.length - 1,
      speed: 0.25 + hash2(candidate.x, candidate.y, 941) * 0.16,
      pause: 1500 + hash2(candidate.x, candidate.y, 942) * 3500,
      phase: hash2(candidate.x, candidate.y, 943) * 60000,
    });
  }
  const movingFigureTiles = new Set(walkers.map((walker) => walker.tileKey));

  const animals = decorData.props
    .filter(isAnimal)
    .sort((a, b) => hash2(a.x, a.y, 950) - hash2(b.x, b.y, 950))
    .slice(0, 2)
    .map((prop) => ({
      propId: propKey(prop),
      kind: prop.t,
      x: prop.x,
      y: prop.y,
      level: model.surface[prop.y]![prop.x]!,
      phase: hash2(prop.x, prop.y, 951) * Math.PI * 2,
      seed: hash2(prop.x, prop.y, 952),
    }));
  const movingAnimalPropIds = new Set(animals.map((animal) => animal.propId));
  for (const prop of decorData.props) {
    if (prop.t !== 'lamp') continue;
    const point = mapToScreen(prop.x + 0.5, prop.y + 0.5, model.surface[prop.y]![prop.x]!);
    lamps.push({
      sx: point.sx,
      sy: point.sy - 15,
      chance: 1,
      phase: hash2(prop.x, prop.y, 953) * Math.PI * 2,
    });
  }
  const occlusionTiles = new Set<number>();
  if (decorPlan) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (decorPlan.taken[y]![x]) occlusionTiles.add(tileKey(x, y));
      }
    }
    for (const key of decorPlan.plants.keys()) occlusionTiles.add(key);
    for (const key of decorPlan.figures.keys()) occlusionTiles.add(key);
  }
  for (const placement of scene.placements) {
    const b = placement.building;
    occlusionTiles.add(tileKey(b.x + b.w - 1, b.y + b.d - 1));
  }
  for (const wall of scene.walls) occlusionTiles.add(tileKey(wall.x, wall.y));
  for (const prop of decorData.props) occlusionTiles.add(tileKey(prop.x, prop.y));
  for (const [x, y, width, depth] of decorData.fences) {
    for (let fy = y; fy < y + depth; fy++) {
      for (let fx = x; fx < x + width; fx++) occlusionTiles.add(tileKey(fx, fy));
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (decorData.fields[y]![x] !== 0) occlusionTiles.add(tileKey(x, y));
    }
  }

  const treeKinds = new Set<PlantKind>(['oak', 'spruce', 'poplar', 'umbrella', 'birch', 'autumn', 'blossom', 'willow']);
  const fireflyCandidates: { anchor: FireflyAnchor; rank: number }[] = [];
  for (const [key, plants] of decorPlan?.plants ?? []) {
    const x = key % 1000;
    const y = Math.floor(key / 1000);
    if (x < width * 0.52 && y > height * 0.25) continue;
    for (const plant of plants) {
      if (!treeKinds.has(plant.kind)) continue;
      const rank = hash2(x, y, Math.floor(plant.ox * 1000) + 960);
      fireflyCandidates.push({
        anchor: {
          x,
          y,
          ox: plant.ox,
          oy: plant.oy,
          level: model.surface[y]![x]!,
          size: plant.s,
          phase: hash2(x, y, Math.floor(plant.oy * 1000) + 961) * Math.PI * 2,
        },
        rank,
      });
    }
  }
  fireflyCandidates.sort((a, b) => a.rank - b.rank);
  const fireflies = fireflyCandidates.slice(0, 20).map(({ anchor }) => anchor);
  const particleSeeds: ParticleSeeds = {
    x: new Float32Array(160),
    y: new Float32Array(160),
    speed: new Float32Array(160),
    phase: new Float32Array(160),
  };
  for (let index = 0; index < particleSeeds.x.length; index++) {
    particleSeeds.x[index] = hash2(index, 1, 960);
    particleSeeds.y[index] = hash2(index, 2, 961);
    particleSeeds.speed[index] = 0.65 + hash2(index, 3, 962) * 0.7;
    particleSeeds.phase[index] = hash2(index, 4, 963) * Math.PI * 2;
  }

  return {
    smoke,
    flags,
    clouds,
    cloudSafeTiles,
    walkers,
    animals,
    movingFigureTiles,
    movingAnimalPropIds,
    occlusionTiles,
    windows,
    lamps,
    fireflies,
    particleSeeds,
  };
}

export function updateWalkerPosition(walker: WalkerAnchor, time: number, animated: boolean): RoutePoint {
  const first = walker.route[0]!;
  if (!animated) {
    walker.current.x = first.x;
    walker.current.y = first.y;
    walker.current.level = first.level;
    return walker.current;
  }
  const travel = (walker.routeLength / walker.speed) * 1000;
  const cycle = travel * 2 + walker.pause * 2;
  const elapsed = ((time + walker.phase) % cycle + cycle) % cycle;
  let distance: number;
  if (elapsed < travel) distance = elapsed * walker.speed / 1000;
  else if (elapsed < travel + walker.pause) distance = walker.routeLength;
  else if (elapsed < travel * 2 + walker.pause) {
    distance = walker.routeLength - (elapsed - travel - walker.pause) * walker.speed / 1000;
  } else distance = 0;

  const index = Math.min(walker.routeLength - 1, Math.floor(distance));
  const fraction = distance - index;
  const from = walker.route[index]!;
  const to = walker.route[index + 1]!;
  walker.current.x = from.x + (to.x - from.x) * fraction;
  walker.current.y = from.y + (to.y - from.y) * fraction;
  walker.current.level = from.level + (to.level - from.level) * fraction;
  return walker.current;
}
