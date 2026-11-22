import { describe, expect, it } from 'vitest';
import { townRoadLayer } from '../roads/town';
import { townModel } from '../terrain/town';
import { buildWaterEffectScene } from './waterEffects';

const effects = buildWaterEffectScene(townModel, townRoadLayer);

describe('buildWaterEffectScene', () => {
  it('selects stable shimmer, cascade and bridge-contact locations from existing geometry', () => {
    expect(buildWaterEffectScene(townModel, townRoadLayer)).toEqual(effects);
    expect(effects.tiles.length).toBeGreaterThan(0);
    expect(effects.waterfalls.length).toBeGreaterThan(0);
    expect(effects.bridgeFoam.length).toBeGreaterThan(0);
    expect(effects.tiles.every(({ x, y }) => townModel.terrain.water[y]![x])).toBe(true);
    expect(effects.waterfalls.every(({ face }) => face.kind === 'cascade')).toBe(true);
  });

  it('places bridge foam only at water edges adjacent to a bridge deck', () => {
    for (const effect of effects.bridgeFoam) {
      expect(townModel.terrain.water[effect.y]![effect.x]).toBe(true);
      const neighbor = {
        north: [effect.x, effect.y - 1],
        east: [effect.x + 1, effect.y],
        south: [effect.x, effect.y + 1],
        west: [effect.x - 1, effect.y],
      }[effect.side]!;
      expect(townRoadLayer.decks[neighbor[1]!]?.[neighbor[0]!]).toBe(true);
    }
  });
});
