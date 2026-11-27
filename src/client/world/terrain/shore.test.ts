import { describe, expect, it } from 'vitest';
import { makeTerrain } from './fixtures';
import { shoreDistance } from './shore';

describe('shoreDistance', () => {
  it('is 0 on land and counts rings of water away from it', () => {
    // A 1-tile-high strip: land, then four water tiles, then land.
    const terrain = makeTerrain([[0, 0, 0, 0, 0, 0, 0]], {
      water: [[false, true, true, true, true, true, false]],
    });
    expect(shoreDistance(terrain)[0]).toEqual([0, 1, 2, 3, 2, 1, 0]);
  });

  it('counts diagonal neighbours as one step', () => {
    const terrain = makeTerrain(
      [
        [0, 0],
        [0, 0],
      ],
      {
        water: [
          [false, true],
          [true, true],
        ],
      },
    );
    expect(shoreDistance(terrain)[1]![1]).toBe(1);
  });

  it('does not treat the map edge as land', () => {
    const terrain = makeTerrain([[0, 0, 0]], { water: [[true, true, true]] });
    expect(shoreDistance(terrain)[0]).toEqual([Infinity, Infinity, Infinity]);
  });
});
