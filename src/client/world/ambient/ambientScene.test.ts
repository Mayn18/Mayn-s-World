import { describe, expect, it, vi } from 'vitest';
import { buildScene } from '../buildings/scene';
import { townBuildings, townDecor, townWalls } from '../data/loader';
import { tileKey } from '../decor/plan';
import { buildDecorLayer } from '../decor/layer';
import { townRoadLayer } from '../roads/town';
import { townModel } from '../terrain/town';
import { themes } from '../themes';
import { buildAmbientScene, updateWalkerPosition } from './ambientScene';
import { staticCachePaintOptions } from './ambientScene';
import { paintActors } from './ambientPainter';
import { buildingPalette } from '../buildings/palette';
import { terrainPalette } from '../render/terrainPalette';

const decor = buildDecorLayer(townModel, townRoadLayer, townBuildings, townWalls, townDecor);
const scene = buildScene(townModel, townBuildings, townWalls, undefined, decor);
const ambient = buildAmbientScene(townModel, townRoadLayer, scene, townDecor);

describe('buildAmbientScene', () => {
  it('creates stable smoke, flag and cloud anchors without changing world placements', () => {
    const before = JSON.stringify(townModel.terrain);
    expect(buildAmbientScene(townModel, townRoadLayer, scene, townDecor)).toEqual(ambient);
    expect(ambient.smoke.length).toBeGreaterThan(0);
    expect(ambient.flags.length).toBeGreaterThan(0);
    expect(ambient.clouds.length).toBeGreaterThan(0);
    expect(ambient.walkers).toHaveLength(2);
    expect(ambient.animals).toHaveLength(2);
    expect(ambient.lamps).toHaveLength(23);
    expect(ambient.windows.length).toBeGreaterThan(0);
    expect(ambient.fireflies.length).toBeGreaterThan(0);
    expect(ambient.particleSeeds.x).toHaveLength(160);
    expect(JSON.stringify(townModel.terrain)).toBe(before);
  });

  it('keeps walkers on existing road tiles and animals on existing prop anchors', () => {
    for (const walker of ambient.walkers) {
      expect(ambient.movingFigureTiles.has(walker.tileKey)).toBe(true);
      for (const point of walker.route) {
        const x = Math.floor(point.x);
        const y = Math.floor(point.y);
        const road = townModel.terrain.roadTiles[y]![x];
        expect(townRoadLayer.plaza[y]![x] || (road && road.kind !== 'path' && road.kind !== 'pier')).toBe(true);
      }
    }
    for (const animal of ambient.animals) {
      expect(ambient.movingAnimalPropIds.has(animal.propId)).toBe(true);
      expect(townDecor.props.some((prop) =>
        prop.x === animal.x && prop.y === animal.y && prop.t === animal.kind,
      )).toBe(true);
    }
  });

  it('updates walkers deterministically, pauses at route ends and restores the static anchor', () => {
    const walker = ambient.walkers[0]!;
    const positions = Array.from({ length: 10 }, (_, index) => {
      const position = updateWalkerPosition(walker, index * 5000, true);
      return { x: position.x, y: position.y, level: position.level };
    });
    expect(new Set(positions.map((position) => `${position.x},${position.y}`)).size).toBeGreaterThan(1);
    const firstAtTime = { ...updateWalkerPosition(walker, 1000, true) };
    expect({ ...updateWalkerPosition(walker, 1000, true) }).toEqual(firstAtTime);
    const travel = (walker.routeLength / walker.speed) * 1000;
    const cycle = travel * 2 + walker.pause * 2;
    const endPauseTime = ((travel + walker.pause / 2 - walker.phase) % cycle + cycle) % cycle;
    expect(updateWalkerPosition(walker, endPauseTime, true)).toEqual(walker.route[walker.route.length - 1]);
    expect(updateWalkerPosition(walker, 1000, false)).toEqual(walker.route[0]);
  });

  it('keeps cloud shadow tiles off roads, water, crops, props and vegetation', () => {
    let safeTileCount = 0;
    for (let y = 0; y < townModel.terrain.height; y++) {
      for (let x = 0; x < townModel.terrain.width; x++) {
        if (!ambient.cloudSafeTiles[y]![x]) continue;
        safeTileCount++;
        expect(townModel.terrain.water[y]![x]).toBe(false);
        expect(townModel.terrain.roadTiles[y]![x]).toBeFalsy();
        expect(townRoadLayer.plaza[y]![x]).toBe(false);
        expect(townRoadLayer.decks[y]![x]).toBe(false);
        expect(townDecor.fields[y]![x]).toBe(0);
        expect(decor.plan.taken[y]![x]).toBe(false);
        expect(decor.plan.plants.has(tileKey(x, y))).toBe(false);
      }
    }
    expect(safeTileCount).toBeGreaterThan(0);
  });

  it('keeps moving figures out of the static cache and skips their updates at aerial zoom', () => {
    const options = staticCachePaintOptions(ambient);
    expect(options.animatedStatic).toBe(false);
    expect(options.movingFigureTiles).toBe(ambient.movingFigureTiles);
    expect(options.movingAnimalPropIds).toBe(ambient.movingAnimalPropIds);

    const walker = ambient.walkers[0]!;
    const initial = { ...walker.current };
    const drawImage = vi.fn();
    paintActors(
      { drawImage },
      ambient,
      [],
      scene,
      townModel,
      themes['daytime-meadow'],
      buildingPalette(themes['daytime-meadow']),
      terrainPalette(themes['daytime-meadow']),
      options,
      12000,
      true,
      1,
    );

    expect(walker.current).toEqual(initial);
    expect(drawImage).not.toHaveBeenCalled();
  });
});
