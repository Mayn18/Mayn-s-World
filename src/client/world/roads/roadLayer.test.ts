import { describe, expect, it } from 'vitest';
import { makeTerrain } from '../terrain/fixtures';
import { buildTerrainModel } from '../terrain/model';
import { townModel } from '../terrain/town';
import { findCrossingSteps } from './crossings';
import { buildRoadLayer, climbKey, groundKind, isPaved } from './roadLayer';
import { townRoadLayer } from './town';

describe('groundKind', () => {
  const road = (kind: 'main' | 'lane' | 'path' | 'pier') => ({ kind, axis: 'x' as const, name: kind });

  it('says what each kind of road on land is paved with', () => {
    const model = buildTerrainModel(
      makeTerrain([[1, 1, 1, 1, 1]], {
        roadTiles: [[road('main'), road('lane'), road('path'), road('pier'), null]],
      }),
    );
    const layer = buildRoadLayer(model);
    expect([0, 1, 2, 3, 4].map((x) => groundKind(model, layer, x, 0))).toEqual([
      'main',
      'lane',
      'path',
      null, // a pier tile that stands on land is left as grass
      null,
    ]);
  });

  it('never calls a water tile ground, even with a road on it', () => {
    const model = buildTerrainModel(
      makeTerrain([[1, 1]], { water: [[false, true]], roadTiles: [[road('main'), road('main')]] }),
    );
    const layer = buildRoadLayer(model);
    expect(groundKind(model, layer, 0, 0)).toBe('main');
    expect(groundKind(model, layer, 1, 0)).toBeNull();
    expect(layer.decks[0]).toEqual([false, true]);
  });

  it('answers null outside the map', () => {
    const model = buildTerrainModel(makeTerrain([[1]]));
    const layer = buildRoadLayer(model);
    expect(groundKind(model, layer, -1, 0)).toBeNull();
    expect(groundKind(model, layer, 0, 5)).toBeNull();
  });
});

describe('isPaved', () => {
  it('is true for streets and the square, false for earth and for nothing', () => {
    expect(isPaved('main')).toBe(true);
    expect(isPaved('plaza')).toBe(true);
    expect(isPaved('lane')).toBe(false);
    expect(isPaved('path')).toBe(false);
    expect(isPaved(null)).toBe(false);
  });
});

describe('the town road layer', () => {
  const { width, height } = townModel.terrain;

  it('keeps every ramp and stairs step that a viewer in the south-east can see', () => {
    const visible = findCrossingSteps(townModel.terrain).filter(
      (s) => s.direction === 'S' || s.direction === 'E',
    );
    expect(visible.length).toBeGreaterThan(0);
    expect(townRoadLayer.climbs.size).toBe(visible.length);
    for (const step of visible) {
      const side = step.direction === 'S' ? 'south' : 'east';
      expect(townRoadLayer.climbs.get(climbKey(step.high.x, step.high.y, side))).toEqual(step);
    }
  });

  it('puts every climb on a tile that really has a face on that side', () => {
    for (const key of townRoadLayer.climbs.keys()) {
      const [x, y, side] = key.split(',') as [string, string, 'south' | 'east'];
      expect(townModel.faces[Number(y)]![Number(x)]![side], key).not.toBeNull();
    }
  });

  it('has a paved square made only of land, and the fountain stands in it', () => {
    let squareTiles = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!townRoadLayer.plaza[y]![x]!) continue;
        squareTiles++;
        expect(townModel.terrain.water[y]![x]!, `(${x}, ${y})`).toBe(false);
      }
    }
    expect(squareTiles).toBeGreaterThan(50);
    expect(groundKind(townModel, townRoadLayer, 38, 30)).toBe('plaza');
  });

  it('marks a deck wherever a road runs over water, and nowhere else', () => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const overWater = townModel.terrain.roadTiles[y]![x] !== null && townModel.terrain.water[y]![x]!;
        expect(townRoadLayer.decks[y]![x]!, `(${x}, ${y})`).toBe(overWater);
      }
    }
  });

  it('gives each tile at most one of: ground, deck', () => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const ground = groundKind(townModel, townRoadLayer, x, y) !== null;
        expect(ground && townRoadLayer.decks[y]![x]!, `(${x}, ${y})`).toBe(false);
      }
    }
  });
});
