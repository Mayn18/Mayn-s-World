// Where everything stands in the meadow. Pure data, no React.
//
// Positions are in "art pixels" on the 320 x 180 canvas (see backdrop.ts), as
// the top-left corner of each sprite. The scene component turns them into
// percentages, so the picture scales to any screen width.
//
// To move something, change its x or y. To add scenery, add an entry.
import type { DestinationId } from '../../content/destinations';
import type { Sprite } from '../sprite';
import * as art from '../art/sprites';

export interface Placement {
  sprite: Sprite;
  x: number;
  y: number;
}

// Things that float in the sky. They are drawn first (behind everything).
export interface SkyItem extends Placement {
  kind: 'sun' | 'cloud';
  // Clouds drift slowly left and right: how far (percent of the scene width),
  // how long one way takes (seconds), and a negative delay so the clouds do
  // not all start in the same place.
  drift?: { distance: number; seconds: number; delay: number };
}

export const sky: readonly SkyItem[] = [
  { kind: 'sun', sprite: art.sun, x: 262, y: 6 },
  { kind: 'cloud', sprite: art.cloudLarge, x: 24, y: 14, drift: { distance: 6, seconds: 70, delay: -20 } },
  { kind: 'cloud', sprite: art.cloudMedium, x: 140, y: 34, drift: { distance: 4, seconds: 55, delay: -30 } },
  { kind: 'cloud', sprite: art.cloudSmall, x: 206, y: 40, drift: { distance: 5, seconds: 45, delay: -8 } },
];

// Everything standing on the ground. Each item is drawn in order of its feet
// (bottom edge), so things lower on screen overlap things higher up, as they
// would in the real world.
export type GroundItem =
  | (Placement & { kind: 'decor' })
  // A destination you can select: the sprite is a link with a visible label.
  | (Placement & { kind: 'object'; destination: DestinationId })
  | (Placement & { kind: 'signpost' })
  // A flower that sways. delay is in seconds (negative = already underway).
  | (Placement & { kind: 'flower'; delay: number });

const unsorted: GroundItem[] = [
  { kind: 'decor', sprite: art.smallTree, x: 98, y: 70 },
  { kind: 'decor', sprite: art.smallTree, x: 142, y: 66 },
  { kind: 'decor', sprite: art.smallTree, x: 254, y: 66 },
  { kind: 'decor', sprite: art.tree, x: 4, y: 58 },
  { kind: 'decor', sprite: art.tree, x: 280, y: 60 },
  { kind: 'decor', sprite: art.bush, x: 90, y: 104 },
  { kind: 'decor', sprite: art.bush, x: 166, y: 98 },
  { kind: 'decor', sprite: art.bush, x: 252, y: 106 },
  { kind: 'object', sprite: art.cabin, x: 196, y: 76, destination: 'about' },
  { kind: 'object', sprite: art.noticeBoard, x: 50, y: 86, destination: 'projects' },
  { kind: 'object', sprite: art.mailbox, x: 240, y: 124, destination: 'contact' },
  { kind: 'signpost', sprite: art.signpost, x: 98, y: 122 },
  { kind: 'flower', sprite: art.flowerPink, x: 24, y: 150, delay: 0 },
  { kind: 'flower', sprite: art.flowerYellow, x: 46, y: 164, delay: -1 },
  { kind: 'flower', sprite: art.flowerWhite, x: 78, y: 170, delay: -2 },
  { kind: 'flower', sprite: art.flowerYellow, x: 268, y: 162, delay: -0.5 },
  { kind: 'flower', sprite: art.flowerPink, x: 294, y: 148, delay: -1.5 },
  { kind: 'flower', sprite: art.flowerWhite, x: 226, y: 170, delay: -2.5 },
];

// Array.prototype.sort is stable, so items with equal feet keep their order.
export const ground: readonly GroundItem[] = [...unsorted].sort(
  (a, b) => a.y + a.sprite.height - (b.y + b.sprite.height),
);

// The signpost's planks. Each is a real link with real text, positioned on the
// post: "right" planks extend to the right of the post, "left" planks to the
// left, like a real signpost. y is in art pixels.
export interface Plank {
  destination: DestinationId;
  side: 'left' | 'right';
  y: number;
}

export const planks: readonly Plank[] = [
  { destination: 'blog', side: 'right', y: 126 },
  { destination: 'resume', side: 'left', y: 138 },
  { destination: 'github', side: 'right', y: 150 },
];

// Horizontal centre of the signpost post, where planks attach.
export const signpostCenterX: number = 98 + art.signpost.width / 2;
