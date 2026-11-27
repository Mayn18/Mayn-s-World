import { describe, expect, it } from 'vitest';
import { townModel } from '../terrain/town';
import { faceCorners } from './faceGeometry';
import { tileCorners } from './projection';

// tileCorners order: north, east, south, west.
describe('face geometry has no seams', () => {
  it('puts a south face\'s top edge exactly on its own tile\'s S-W edge', () => {
    const face = { kind: 'cliff', top: 3, bottom: 1 } as const;
    const [topLeft, topRight] = faceCorners(4, 6, 'south', face);
    const [, , south, west] = tileCorners(4, 6, 3);
    expect(topLeft).toEqual(west);
    expect(topRight).toEqual(south);
  });

  it('puts an east face\'s top edge exactly on its own tile\'s S-E edge', () => {
    const face = { kind: 'cliff', top: 3, bottom: 1 } as const;
    const [topLeft, topRight] = faceCorners(4, 6, 'east', face);
    const [, east, south] = tileCorners(4, 6, 3);
    expect(topLeft).toEqual(south);
    expect(topRight).toEqual(east);
  });

  it('lands every step\'s bottom edge exactly on the lower tile\'s top edge (whole town)', () => {
    let checked = 0;
    for (const edge of townModel.edges) {
      if (edge.direction !== 'S' && edge.direction !== 'E') continue;
      const side = edge.direction === 'S' ? 'south' : 'east';
      const [, , bottomRight, bottomLeft] = faceCorners(edge.high.x, edge.high.y, side, edge);
      const [north, east, , west] = tileCorners(edge.low.x, edge.low.y, edge.bottom);
      // A south step meets the lower tile's N-E edge; an east step its W-N edge.
      expect([bottomLeft, bottomRight]).toEqual(side === 'south' ? [north, east] : [west, north]);
      checked++;
    }
    expect(checked).toBeGreaterThan(300);
  });
});
