import { describe, expect, it } from 'vitest';
import { makeTerrain } from '../terrain/fixtures';
import { buildTerrainModel } from '../terrain/model';
import { townModel } from '../terrain/town';
import { worldBounds } from './bounds';
import { pickTile } from './picking';
import { tileCenter } from './projection';
import { fitContain, viewToContent } from './viewTransform';

// A tile's centre can be hidden behind a taller tile in front of it (a level 4 tile
// covers about 40 px of the ground behind it). Picking must return the tile the
// visitor SEES, so only tiles whose centre is not covered are expected to pick
// themselves. This works out which those are by a separate brute-force check: no
// tile drawn later has a top diamond containing the centre.
function covered(x: number, y: number): boolean {
  const c = tileCenter({ x, y }, townModel.surface[y]![x]!);
  for (let ny = y; ny <= Math.min(59, y + 12); ny++) {
    for (let nx = x; nx <= Math.min(79, x + 12); nx++) {
      if (nx + ny <= x + y) continue;
      const o = tileCenter({ x: nx, y: ny }, townModel.surface[ny]![nx]!);
      if (Math.abs(c.sx - o.sx) / 16 + Math.abs(c.sy - o.sy) / 8 <= 1) return true;
    }
  }
  return false;
}
const visible = townModel.order.filter(({ x, y }) => !covered(x, y));

describe('pickTile', () => {
  it('finds a tile from the centre of its top surface wherever that centre is visible', () => {
    // Most of the map is visible; the rest is hidden behind taller ground.
    expect(visible.length).toBeGreaterThan(4000);
    for (const { x, y } of visible) {
      const { sx, sy } = tileCenter({ x, y }, townModel.surface[y]![x]!);
      expect(pickTile(townModel, sx, sy), `(${x}, ${y})`).toMatchObject({ x, y });
    }
  });

  it('returns the nearer, taller tile where ground is hidden', () => {
    const hidden = townModel.order.find(({ x, y }) => covered(x, y))!;
    const { sx, sy } = tileCenter(hidden, townModel.surface[hidden.y]![hidden.x]!);
    const picked = pickTile(townModel, sx, sy)!;
    expect(picked.x + picked.y).toBeGreaterThan(hidden.x + hidden.y);
  });

  it('reports level and water', () => {
    const wet = townModel.order.find(({ x, y }) => townModel.terrain.water[y]![x]!)!;
    const { sx, sy } = tileCenter(wet, townModel.surface[wet.y]![wet.x]!);
    expect(pickTile(townModel, sx, sy)).toMatchObject({
      x: wet.x,
      y: wet.y,
      water: true,
      level: townModel.terrain.levels[wet.y]![wet.x],
    });
  });

  it('prefers the nearer tile where a tall tile\'s top hides the one behind', () => {
    const model = buildTerrainModel(makeTerrain([[0, 0, 0], [0, 0, 0], [0, 0, 5]]));
    // Tile (2,2) at level 5 is lifted 50 px: its centre is not on any lower tile centre.
    const { sx, sy } = tileCenter({ x: 2, y: 2 }, 5);
    expect(pickTile(model, sx, sy)).toMatchObject({ x: 2, y: 2, level: 5 });
  });

  it('finds nothing outside the world', () => {
    expect(pickTile(townModel, -100000, 0)).toBeNull();
  });
});

// The whole chain a pointer goes through: window -> picture -> projection -> tile.
describe('picking stays accurate at different viewport sizes', () => {
  const bounds = worldBounds(townModel);
  const sizes: [string, number, number][] = [
    ['desktop', 1440, 900],
    ['full HD', 1920, 1080],
    ['ultrawide', 3440, 1440],
    ['portrait phone', 390, 844],
    ['landscape phone', 844, 390],
  ];

  for (const [name, w, h] of sizes) {
    it(`${name} (${w} x ${h}): pointing at a tile's centre on screen picks that tile`, () => {
      const view = fitContain(w, h, bounds.width, bounds.height);
      let checked = 0;
      for (const { x, y } of visible) {
        const c = tileCenter({ x, y }, townModel.surface[y]![x]!);
        // Where that centre appears in the window:
        const px = (c.sx - bounds.left) * view.scale + view.offsetX;
        const py = (c.sy - bounds.top) * view.scale + view.offsetY;
        // ...and the pointer path back to a tile:
        const inPicture = viewToContent(view, px, py)!;
        const picked = pickTile(townModel, inPicture.x + bounds.left, inPicture.y + bounds.top);
        expect(picked, `(${x}, ${y})`).toMatchObject({ x, y });
        checked++;
      }
      expect(checked).toBe(visible.length);
    });
  }
});
