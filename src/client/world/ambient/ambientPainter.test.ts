import { describe, expect, it, vi } from 'vitest';
import { themes } from '../themes';
import {
  occluderPaintsAfterActor,
  paintFireflies,
  paintNightLights,
  paintSmoke,
  paintWeather,
} from './ambientPainter';
import type { AmbientScene } from './ambientScene';
import { buildingPalette } from '../buildings/palette';
import { townBuildings } from '../data/loader';

function createContext() {
  const calls = {
    fillRect: vi.fn<(x: number, y: number, width: number, height: number) => void>(),
    moveTo: vi.fn<(x: number, y: number) => void>(),
    lineTo: vi.fn<(x: number, y: number) => void>(),
    stroke: vi.fn<() => void>(),
  };
  const context = {
    save: vi.fn<() => void>(),
    restore: vi.fn<() => void>(),
    setTransform: vi.fn<(...args: [number, number, number, number, number, number]) => void>(),
    beginPath: vi.fn<() => void>(),
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    ...calls,
  };
  return { context, calls };
}

const particleSeeds = {
  x: Float32Array.from([0.1, 0.4, 0.8]),
  y: Float32Array.from([0.2, 0.5, 0.9]),
  speed: Float32Array.from([0.8, 1, 1.2]),
  phase: Float32Array.from([0.2, 1.1, 2.4]),
};

const ambient = {
  fireflies: [
    { x: 2, y: 3, ox: 0.2, oy: 0.4, level: 1, size: 1, phase: 0.3 },
    { x: 8, y: 5, ox: 0.7, oy: 0.6, level: 0, size: 1.2, phase: 1.5 },
  ],
  windows: [
    { sx: 10, sy: 20, chance: 0.05, phase: 0.1 },
    { sx: 30, sy: 40, chance: 0.3, phase: 0.7 },
  ],
  lamps: [
    { sx: 50, sy: 60, chance: 1, phase: 0.2 },
    { sx: 70, sy: 80, chance: 1, phase: 0.9 },
  ],
  particleSeeds,
} satisfies Pick<AmbientScene, 'fireflies' | 'windows' | 'lamps' | 'particleSeeds'>;

describe('ambient painter theme effects', () => {
  it('keeps animated smoke aligned in size and opacity with its static fallback', () => {
    const makeSmokeContext = () => {
      const alphas: number[] = [];
      let globalAlpha = 1;
      const context = {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn<(x: number, y: number, radius: number, start: number, end: number) => void>(),
        fill: vi.fn(),
        fillStyle: '',
        get globalAlpha() {
          return globalAlpha;
        },
        set globalAlpha(value: number) {
          globalAlpha = value;
          alphas.push(value);
        },
      };
      return { context, alphas };
    };
    const anchor = { sx: 20, sy: 40, seed: 1, phase: 0.4 };
    const staticFrame = makeSmokeContext();
    const animatedFrame = makeSmokeContext();

    paintSmoke(staticFrame.context, anchor, buildingPalette(themes['daytime-meadow']), 0, false);
    paintSmoke(animatedFrame.context, anchor, buildingPalette(themes['daytime-meadow']), 700, true);

    expect(staticFrame.context.arc.mock.calls.map(([, , radius]) => radius))
      .toEqual(animatedFrame.context.arc.mock.calls.map(([, , radius]) => radius));
    expect(animatedFrame.alphas).toHaveLength(staticFrame.alphas.length);
    animatedFrame.alphas.forEach((alpha, index) => {
      expect(alpha).toBeGreaterThan(staticFrame.alphas[index]! * 0.79);
      expect(alpha).toBeLessThan(staticFrame.alphas[index]! * 1.21);
    });
    expect(animatedFrame.context.arc).toHaveBeenCalledTimes(3);
  });

  it('resolves equal-depth occlusion by the painter tie-break and preserves nearby depth order', () => {
    const anchorForBuilding = (id: number) => {
      const building = townBuildings.find(({ id: buildingId }) => buildingId === id)!;
      return { x: building.x + building.w - 1, y: building.y + building.d - 1 };
    };
    const storeAnchor = anchorForBuilding(62);
    const tavernAnchor = anchorForBuilding(63);

    expect(occluderPaintsAfterActor(
      storeAnchor.x,
      storeAnchor.y,
      storeAnchor.x - 0.5,
      storeAnchor.y + 0.5,
    )).toBe(true);
    expect(occluderPaintsAfterActor(
      storeAnchor.x,
      storeAnchor.y,
      storeAnchor.x + 0.5,
      storeAnchor.y - 0.5,
    )).toBe(false);
    expect(occluderPaintsAfterActor(
      tavernAnchor.x,
      tavernAnchor.y,
      tavernAnchor.x - 0.5,
      tavernAnchor.y + 0.5,
    )).toBe(true);
    expect(occluderPaintsAfterActor(
      storeAnchor.x,
      storeAnchor.y + 1,
      storeAnchor.x - 0.5,
      storeAnchor.y + 0.5,
    )).toBe(true);
    expect(occluderPaintsAfterActor(
      storeAnchor.x,
      storeAnchor.y - 1,
      storeAnchor.x - 0.5,
      storeAnchor.y + 0.5,
    )).toBe(false);
  });

  it('only paints fireflies in Enchanted Forest and scales their count with zoom', () => {
    const { context, calls } = createContext();
    paintFireflies(context, ambient, themes['daytime-meadow'], 1000, true, 2);
    expect(calls.fillRect).not.toHaveBeenCalled();

    paintFireflies(context, ambient, themes['enchanted-forest'], 1000, true, 1);
    expect(calls.fillRect).toHaveBeenCalledTimes(2);
  });

  it('paints deterministic lamp and window accents only in Cozy Night', () => {
    const { context, calls } = createContext();
    paintNightLights(context, ambient, themes['rainy-evening'], 1000, true);
    expect(calls.fillRect).not.toHaveBeenCalled();

    paintNightLights(context, ambient, themes['cozy-night'], 1000, false);
    expect(calls.fillRect.mock.calls).toEqual([
      [9, 19, 2, 2.5],
      [29, 39, 2, 2.5],
      [48.5, 58.5, 3, 3],
      [68.5, 78.5, 3, 3],
    ]);
  });

  it('selects Rainy Evening and Snowy Cabin weather with zoom/device-scaled density', () => {
    const rainContext = createContext();
    const rainScene = {
      particleSeeds: {
        x: new Float32Array(160),
        y: new Float32Array(160),
        speed: new Float32Array(160).fill(1),
        phase: new Float32Array(160),
      },
    };
    paintWeather(rainContext.context, rainScene, themes['rainy-evening'], 500, true, 300, 200, 2, 1, 0.5);
    expect(rainContext.calls.stroke).toHaveBeenCalledTimes(34);

    const snowContext = createContext();
    paintWeather(snowContext.context, rainScene, themes['snowy-cabin'], 500, true, 300, 200, 2, 1, 0.5);
    expect(snowContext.calls.fillRect).toHaveBeenCalledTimes(22);

    const clearContext = createContext();
    paintWeather(clearContext.context, rainScene, themes['daytime-meadow'], 500, true, 300, 200, 2, 3, 1);
    expect(clearContext.calls.stroke).not.toHaveBeenCalled();
    expect(clearContext.calls.fillRect).not.toHaveBeenCalled();
  });

  it('keeps weather stationary when animation is disabled', () => {
    const first = createContext();
    const second = createContext();
    paintWeather(first.context, ambient, themes['rainy-evening'], 100, false, 300, 200, 2, 2, 1);
    paintWeather(second.context, ambient, themes['rainy-evening'], 9000, false, 300, 200, 2, 2, 1);
    expect(first.calls.moveTo.mock.calls).toEqual(second.calls.moveTo.mock.calls);
  });
});
