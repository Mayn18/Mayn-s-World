import { describe, expect, it } from 'vitest';
import { parseSprite, spritePaths } from './sprite';

describe('parseSprite', () => {
  it('reads size and skips empty pixels', () => {
    const sprite = parseSprite({
      rows: ['.R.', 'RWR'],
      legend: { R: 'roof', W: 'wall' },
    });

    expect(sprite.width).toBe(3);
    expect(sprite.height).toBe(2);
    expect(sprite.runs).toEqual([
      { color: 'roof', x: 1, y: 0, width: 1, height: 1 },
      { color: 'roof', x: 0, y: 1, width: 1, height: 1 },
      { color: 'wall', x: 1, y: 1, width: 1, height: 1 },
      { color: 'roof', x: 2, y: 1, width: 1, height: 1 },
    ]);
  });

  it('merges neighbouring pixels of one colour into a single run', () => {
    const sprite = parseSprite({ rows: ['GGG.GG'], legend: { G: 'grass' } });

    expect(sprite.runs).toEqual([
      { color: 'grass', x: 0, y: 0, width: 3, height: 1 },
      { color: 'grass', x: 4, y: 0, width: 2, height: 1 },
    ]);
  });

  it('lets code build taller rectangles directly', () => {
    const paths = spritePaths({
      width: 4,
      height: 3,
      runs: [{ color: 'skyTop', x: 0, y: 0, width: 4, height: 3 }],
    });
    expect(paths).toEqual([{ color: 'skyTop', d: 'M0 0h4v3h-4z' }]);
  });

  it('rejects an empty sprite', () => {
    expect(() => parseSprite({ rows: [], legend: {} })).toThrow('no pixels');
  });

  it('rejects rows of different widths', () => {
    expect(() =>
      parseSprite({ rows: ['GG', 'G'], legend: { G: 'grass' } }),
    ).toThrow('row 1 is 1 wide, expected 2');
  });

  it('rejects a character that is not in the legend', () => {
    expect(() =>
      parseSprite({ rows: ['GX'], legend: { G: 'grass' } }),
    ).toThrow('"X" is not in the legend');
  });
});

describe('spritePaths', () => {
  it('draws each run as a one-pixel-tall rectangle, one path per colour', () => {
    const paths = spritePaths(
      parseSprite({
        rows: ['RRW', '.R.'],
        legend: { R: 'roof', W: 'wall' },
      }),
    );

    expect(paths).toEqual([
      { color: 'roof', d: 'M0 0h2v1h-2zM1 1h1v1h-1z' },
      { color: 'wall', d: 'M2 0h1v1h-1z' },
    ]);
  });
});
