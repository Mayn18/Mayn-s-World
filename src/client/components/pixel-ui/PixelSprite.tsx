import { memo } from 'react';
import { spritePaths, type Sprite } from '../../world/sprite';
import { colorVar } from '../../world/themes';

interface PixelSpriteProps {
  sprite: Sprite;
  className?: string;
}

// Draws a parsed sprite as SVG. It is decorative: aria-hidden removes it from
// the accessibility tree, so screen readers never hear "image" for scenery.
// Anything meaningful (a label, a link) is real HTML placed next to it.
//
// shapeRendering="crispEdges" turns off anti-aliasing so pixels stay sharp when
// the SVG is scaled up. There is no width or height: the parent decides the
// size with CSS, and the viewBox keeps the proportions.
//
// memo: sprites never change, so React can skip re-rendering them when a
// parent updates (for example when the selected destination changes).
export const PixelSprite = memo(function PixelSprite({
  sprite,
  className,
}: PixelSpriteProps) {
  return (
    <svg
      viewBox={`0 0 ${sprite.width} ${sprite.height}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {spritePaths(sprite).map(({ color, d }) => (
        <path key={color} d={d} fill={colorVar(color)} />
      ))}
    </svg>
  );
});
