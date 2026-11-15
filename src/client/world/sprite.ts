// Pixel art as text.
//
// A sprite is a grid of characters, one character per pixel. A legend says
// which theme colour each character means, and "." is empty (see-through):
//
//   rows:   [ ".RR.",          legend: { R: 'roof',
//             "RWWR",                    W: 'wall' }
//             "RWWR" ]
//
// Writing art this way keeps it reviewable in a pull request, original and
// tiny, and it never depends on an image file loading. The parser below turns
// the grid into rectangles; PixelSprite draws them as SVG.
import type { SceneColor } from './themes';

export interface SpriteSource {
  rows: readonly string[];
  legend: Readonly<Record<string, SceneColor>>;
}

// A rectangle of same-coloured pixels. The parser produces 1-pixel-tall strips
// (merging neighbours makes the SVG far smaller than one rectangle per pixel);
// code that builds a sprite directly, such as the backdrop, can use taller ones.
export interface Run {
  color: SceneColor;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Sprite {
  width: number;
  height: number;
  runs: Run[];
}

const EMPTY = '.';

export function parseSprite({ rows, legend }: SpriteSource): Sprite {
  const width = rows[0]?.length ?? 0;
  if (rows.length === 0 || width === 0) {
    throw new Error('Sprite has no pixels');
  }

  const runs: Run[] = [];
  rows.forEach((row, y) => {
    // Every row must be as wide as the first, or the art is misaligned and
    // the mistake would otherwise be a subtle visual glitch.
    if (row.length !== width) {
      throw new Error(`Sprite row ${y} is ${row.length} wide, expected ${width}`);
    }

    let x = 0;
    while (x < width) {
      const char = row[x]!;
      if (char === EMPTY) {
        x += 1;
        continue;
      }
      const color = legend[char];
      if (color === undefined) {
        throw new Error(`Sprite row ${y}: "${char}" is not in the legend`);
      }
      let end = x + 1;
      while (end < width && row[end] === char) {
        end += 1;
      }
      runs.push({ color, x, y, width: end - x, height: 1 });
      x = end;
    }
  });

  return { width, height: rows.length, runs };
}

// One SVG path per colour. Each path is a list of rectangles:
// "M x y" moves there, "h w" draws right, "v h" down, "h-w" back, "z" closes.
export function spritePaths(sprite: Sprite): { color: SceneColor; d: string }[] {
  const byColor = new Map<SceneColor, string>();
  for (const run of sprite.runs) {
    const rect = `M${run.x} ${run.y}h${run.width}v${run.height}h-${run.width}z`;
    byColor.set(run.color, (byColor.get(run.color) ?? '') + rect);
  }
  return [...byColor].map(([color, d]) => ({ color, d }));
}
