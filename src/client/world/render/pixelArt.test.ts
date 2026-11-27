import { describe, expect, it } from 'vitest';
import { recordingContext } from './recordingContext';
import {
  fillPixelPolygon,
  paintPixelCourses,
  snapArtPixel,
  strokePixelLine,
} from './pixelArt';

describe('pixel-art drawing helpers', () => {
  it('snaps positive and negative coordinates to the shared art grid', () => {
    expect([snapArtPixel(1), snapArtPixel(3), snapArtPixel(-3)]).toEqual([2, 4, -2]);
  });

  it('snaps polygon vertices and line endpoints to the art grid', () => {
    const rec = recordingContext();
    fillPixelPolygon(rec.ctx, [
      { sx: 1, sy: 1 },
      { sx: 15, sy: 1 },
      { sx: 15, sy: 15 },
      { sx: 1, sy: 15 },
    ], 'ink');
    strokePixelLine(rec.ctx, { sx: 1, sy: 3 }, { sx: 15, sy: 13 }, 'paper', 1);

    expect(rec.polygons[0]!.points).toEqual([
      { sx: 2, sy: 2 },
      { sx: 16, sy: 2 },
      { sx: 16, sy: 16 },
      { sx: 2, sy: 16 },
    ]);
    expect(rec.lines[0]).toEqual({
      colour: 'paper',
      from: { sx: 2, sy: 4 },
      to: { sx: 16, sy: 14 },
    });
  });

  it('draws staggered material courses as crisp grid-aligned lines', () => {
    const rec = recordingContext();
    paintPixelCourses(rec.ctx, [
      { sx: 0, sy: 0 },
      { sx: 32, sy: 0 },
      { sx: 32, sy: 16 },
      { sx: 0, sy: 16 },
    ], 2, 2, { line: 'stone', joint: 'mortar' });

    expect(rec.lines).toHaveLength(4);
    expect(rec.lines.some((line) => line.colour === 'stone')).toBe(true);
    expect(rec.lines.some((line) => line.colour === 'mortar')).toBe(true);
    expect(rec.lines.every(({ from, to }) => (
      from.sx % 2 === 0 && from.sy % 2 === 0 && to.sx % 2 === 0 && to.sy % 2 === 0
    ))).toBe(true);
  });
});
