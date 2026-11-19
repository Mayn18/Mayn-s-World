import { describe, expect, it } from 'vitest';
import { townTerrain } from '../data/loader';
import { deckTiles, findCrossingSteps } from './crossings';

describe('findCrossingSteps (the real town)', () => {
  const steps = findCrossingSteps(townTerrain);

  it('finds steps for every listed ramp and stairs', () => {
    const listed = townTerrain.crossings.filter((c) => c.kind !== 'bridge');
    expect(listed).toHaveLength(23);
    for (const c of listed) {
      const covered = steps.some(
        (s) =>
          (s.high.x === c.x && s.high.y === c.y) || (s.low.x === c.x && s.low.y === c.y),
      );
      expect(covered, `${c.road} ${c.kind} at (${c.x}, ${c.y})`).toBe(true);
    }
  });

  it('only steps between tiles exactly one level apart, high to low', () => {
    for (const s of steps) {
      const d = townTerrain.levels[s.high.y]![s.high.x]! - townTerrain.levels[s.low.y]![s.low.x]!;
      expect(d).toBe(1);
    }
  });

  it('puts every bridge on a road tile over water', () => {
    const decks = deckTiles(townTerrain);
    for (const c of townTerrain.crossings.filter((k) => k.kind === 'bridge')) {
      expect(decks[c.y]![c.x], `${c.road} at (${c.x}, ${c.y})`).toBe(true);
    }
  });
});
