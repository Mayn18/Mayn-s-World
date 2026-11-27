import { describe, expect, it, vi } from 'vitest';
import { townRoadLayer } from '../roads/town';
import { townModel } from '../terrain/town';
import { buildWaterEffectScene, paintWaterEffects } from './waterEffects';
import { waterTileEffectVisible } from './ambientLod';
import { themes } from '../themes';

const effects = buildWaterEffectScene(townModel, townRoadLayer);

describe('buildWaterEffectScene', () => {
  it('selects stable shimmer, cascade and bridge-contact locations from existing geometry', () => {
    const waterTileCount = townModel.order.filter(({ x, y }) =>
      townModel.terrain.water[y]![x] && !townRoadLayer.decks[y]![x],
    ).length;
    expect(buildWaterEffectScene(townModel, townRoadLayer)).toEqual(effects);
    expect(effects.tiles.length).toBeGreaterThan(0);
    expect(effects.tiles.every(({ shimmer, ripple }) => shimmer || ripple)).toBe(true);
    expect(waterTileCount).toBe(315);
    expect(effects.tiles).toHaveLength(105);
    expect(effects.tiles.length).toBeLessThan(waterTileCount / 2);
    expect(effects.waterfalls.length).toBeGreaterThan(0);
    expect(effects.bridgeFoam.length).toBeGreaterThan(0);
    expect(effects.tiles.every(({ x, y }) => townModel.terrain.water[y]![x])).toBe(true);
    expect(effects.waterfalls.every(({ face }) => face.kind === 'cascade')).toBe(true);
  });

  it('reduces zoomed-out clip and draw calls while keeping all close-up water accents', () => {
    const context = {
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      clip: vi.fn(),
      stroke: vi.fn(),
      ellipse: vi.fn(),
      globalAlpha: 1,
      strokeStyle: '',
      lineWidth: 1,
    };

    paintWaterEffects(context, effects, townModel, themes['daytime-meadow'], 1000, true, 1);
    const aerialCalls = context.save.mock.calls.length;
    context.save.mockClear();
    paintWaterEffects(context, effects, townModel, themes['daytime-meadow'], 1000, true, 2.25);
    const closeCalls = context.save.mock.calls.length;

    const aerialTiles = effects.tiles.filter(({ x, y }) => waterTileEffectVisible(x, y, 1)).length;
    expect(aerialTiles).toBeLessThan(effects.tiles.length / 2);
    expect(closeCalls - aerialCalls).toBe(effects.tiles.length - aerialTiles);
    expect(closeCalls).toBe(effects.tiles.length + effects.waterfalls.length + effects.bridgeFoam.length);
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
