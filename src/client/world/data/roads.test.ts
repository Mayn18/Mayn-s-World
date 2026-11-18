import { describe, expect, it } from 'vitest';
import { rasterizeRoads } from './roads';

function tilesOf(grid: boolean[][]): string[] {
  return grid.flatMap((row, y) => row.flatMap((on, x) => (on ? [`${x},${y}`] : [])));
}

describe('rasterizeRoads', () => {
  it('covers the rows a horizontal strip overlaps (Cottage Road: width 3 at y = 30.5)', () => {
    const grid = rasterizeRoads(
      [{ width: 3, points: [[0, 30.5], [33, 30.5]] }],
      80,
      60,
    );
    const tiles = tilesOf(grid);
    // y from 30.5 - 1.5 = 29 to 32 -> rows 29, 30, 31; x from 0 to 33 -> columns 0 to 32
    expect(tiles).toHaveLength(3 * 33);
    expect(grid[29]![0]).toBe(true);
    expect(grid[31]![32]).toBe(true);
    expect(grid[28]![0]).toBe(false);
    expect(grid[32]![0]).toBe(false);
    expect(grid[30]![33]).toBe(false);
  });

  it('covers a single column for a width-1 strip on a tile centre', () => {
    const grid = rasterizeRoads([{ width: 1, points: [[12.5, 15.5], [12.5, 12]] }], 80, 60);
    // x from 12 to 13 -> column 12; y from 12 to 15.5 -> rows 12, 13, 14, 15
    expect(tilesOf(grid)).toEqual(['12,12', '12,13', '12,14', '12,15']);
  });

  it('follows a path with turns', () => {
    const grid = rasterizeRoads(
      [{ width: 1, points: [[1.5, 0], [1.5, 2.5], [4, 2.5]] }],
      6,
      4,
    );
    expect(grid[0]![1]).toBe(true);
    expect(grid[2]![3]).toBe(true);
    expect(grid[0]![3]).toBe(false);
  });

  it('clamps strips to the map', () => {
    const grid = rasterizeRoads([{ width: 2, points: [[1, -5], [1, 100]] }], 3, 3);
    expect(tilesOf(grid)).toHaveLength(3 * 2);
  });

  it('rejects diagonal segments, missing points and bad widths', () => {
    expect(() => rasterizeRoads([{ width: 1, points: [[0, 0], [3, 3]] }], 10, 10)).toThrow('diagonal');
    expect(() => rasterizeRoads([{ width: 1, points: [[0, 0]] }], 10, 10)).toThrow('two [x, y]');
    expect(() => rasterizeRoads([{ width: 0, points: [[0, 0], [1, 0]] }], 10, 10)).toThrow('width');
    expect(() => rasterizeRoads('nope', 10, 10)).toThrow('list');
  });
});
