import { describe, expect, it } from 'vitest';
import type { Terrain } from '../data/types';
import { type Patch, patchBounds } from './patch';
import { paintTerrain } from './terrainPainter';
import type { TerrainPalette } from './terrainPalette';

// The painter only needs a handful of canvas methods. This stand-in records the
// colour used for each fill() in order, so the test can check what was drawn and
// in which order without a browser.
function recordingContext() {
  const fills: string[] = [];
  let fillStyle = '';
  const ctx = {
    save() {},
    restore() {},
    translate() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    stroke() {},
    set fillStyle(value: string) {
      fillStyle = value;
    },
    get fillStyle() {
      return fillStyle;
    },
    strokeStyle: '',
    lineWidth: 1,
    fill() {
      fills.push(fillStyle);
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, fills };
}

const palette: TerrainPalette = {
  top: ['top0', 'top1', 'top2', 'top3', 'top4', 'top5'],
  water: 'water',
  faceLit: 'lit',
  faceShade: 'shade',
};

function terrainOf(levels: number[][], water?: boolean[][]): Terrain {
  return {
    width: levels[0]!.length,
    height: levels.length,
    levels,
    water: water ?? levels.map((row) => row.map(() => false)),
  };
}

function paint(terrain: Terrain, patch: Patch) {
  const { ctx, fills } = recordingContext();
  paintTerrain(ctx, terrain, patch, palette, patchBounds(patch, 5));
  return fills;
}

describe('paintTerrain', () => {
  it('draws one top per tile plus the slab faces on the south and east edges of a flat patch', () => {
    const patch: Patch = { x: 0, y: 0, width: 2, height: 2 };
    const fills = paint(terrainOf([[0, 0], [0, 0]]), patch);
    expect(fills.filter((c) => c === 'top0')).toHaveLength(4);
    // 2 tiles on the south edge and 2 on the east edge.
    expect(fills.filter((c) => c === 'lit')).toHaveLength(2);
    expect(fills.filter((c) => c === 'shade')).toHaveLength(2);
  });

  it('uses the water colour for water tiles and the level colour for land', () => {
    const patch: Patch = { x: 0, y: 0, width: 2, height: 1 };
    const fills = paint(terrainOf([[2, 0]], [[false, true]]), patch);
    expect(fills).toContain('top2');
    expect(fills).toContain('water');
    expect(fills).not.toContain('top0');
  });

  it('draws a cliff face only where the neighbour to the south or east is lower', () => {
    // A 3 x 1 strip stepping down to the east: 2, 1, 0. Each step is a cliff,
    // plus the slab beyond the last tile and the south slab under every tile.
    const patch: Patch = { x: 0, y: 0, width: 3, height: 1 };
    const fills = paint(terrainOf([[2, 1, 0]]), patch);
    expect(fills.filter((c) => c === 'shade')).toHaveLength(3); // east of each tile
    expect(fills.filter((c) => c === 'lit')).toHaveLength(3); // south slab of each tile
  });

  it('draws nothing south or east of a tile whose neighbour is higher', () => {
    const patch: Patch = { x: 0, y: 0, width: 3, height: 1 };
    const fills = paint(terrainOf([[0, 1, 2]]), patch);
    // Going up to the east: no east faces except the final edge slab.
    expect(fills.filter((c) => c === 'shade')).toHaveLength(1);
  });

  it('paints a tile behind (smaller x + y) before the tile in front of it', () => {
    const patch: Patch = { x: 0, y: 0, width: 2, height: 2 };
    // Distinct levels give each tile its own colour in the fill record.
    const fills = paint(terrainOf([[0, 1], [2, 3]]), patch);
    const tops = fills.filter((c) => c.startsWith('top'));
    expect(tops[0]).toBe('top0'); // (0, 0) is furthest back
    expect(tops[3]).toBe('top3'); // (1, 1) is nearest
  });

  it('draws a tile\'s cliff faces before its own top surface', () => {
    const patch: Patch = { x: 0, y: 0, width: 1, height: 1 };
    const fills = paint(terrainOf([[3]]), patch);
    expect(fills.at(-1)).toBe('top3');
    expect(fills.slice(0, -1).sort()).toEqual(['lit', 'shade']);
  });
});
