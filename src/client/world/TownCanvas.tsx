import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { townTerrain } from './data/loader';
import { TERRAIN_PATCH, maxLevelInPatch, patchBounds } from './render/patch';
import { type PickedTile, pickTile } from './render/picking';
import { paintTerrain } from './render/terrainPainter';
import { terrainPalette } from './render/terrainPalette';
import { defaultTheme, type Theme } from './themes';

interface TownCanvasProps {
  theme?: Theme;
}

// Milestone 1: the terrain patch, drawn on a <canvas>.
//
// React's job here is small: own the <canvas> element and say when to draw. All
// the real work lives in plain modules (projection, depth, painter) that know
// nothing about React.
//
// SIZE
// The canvas's width and height attributes are its drawing resolution in real
// pixels, exactly the size of the picture (see patchBounds), so one art pixel is
// one canvas pixel. The CSS then scales it: width 100% of the column, height
// "auto" so the browser keeps the proportions from the attributes, and
// image-rendering: pixelated so the scaling keeps hard pixel edges instead of
// blurring (see .town-canvas in styles.css).
//
// ACCESSIBILITY
// This picture is an illustration, not a control: it has role="img" and a text
// description, and nothing in it is clickable yet. Navigation stays in the DOM.
export function TownCanvas({ theme = defaultTheme }: TownCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<PickedTile | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  // Worked out once; none of it changes while the page is open.
  const bounds = useMemo(
    () => patchBounds(TERRAIN_PATCH, maxLevelInPatch(townTerrain, TERRAIN_PATCH)),
    [],
  );

  // Draw after the canvas exists in the page, and again if the theme changes.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) {
      setUnsupported(true);
      return;
    }
    ctx.clearRect(0, 0, bounds.width, bounds.height);
    paintTerrain(ctx, townTerrain, TERRAIN_PATCH, terrainPalette(theme), bounds);
  }, [bounds, theme]);

  // The pointer position is in CSS pixels on the scaled canvas. Dividing by the
  // displayed size and multiplying by the drawing size converts it to canvas
  // pixels; adding bounds.left/top converts that to the projection's screen space.
  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const sx = ((event.clientX - rect.left) / rect.width) * bounds.width + bounds.left;
    const sy = ((event.clientY - rect.top) / rect.height) * bounds.height + bounds.top;
    const picked = pickTile(townTerrain, TERRAIN_PATCH, sx, sy);
    // Only update state when the tile changes, to avoid re-rendering on every
    // pixel of movement.
    setHovered((previous) =>
      previous?.x === picked?.x && previous?.y === picked?.y ? previous : picked,
    );
  }

  if (unsupported) {
    return <p>This browser could not draw the terrain preview.</p>;
  }

  return (
    <figure className="m-0">
      <canvas
        ref={canvasRef}
        className="town-canvas"
        width={bounds.width}
        height={bounds.height}
        // Never scale up past the real size: 1.07x would make some pixels
        // wider than others. Scaling down on small screens is still allowed.
        style={{ maxWidth: bounds.width }}
        role="img"
        aria-label={`Terrain preview: a ${TERRAIN_PATCH.width} by ${TERRAIN_PATCH.height} tile section of the town with two levels of raised ground, cliff edges and part of the river.`}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHovered(null)}
      />
      <figcaption className="mt-2 text-sm text-ink-muted">
        {/* Not aria-live: a readout that changes on every mouse move would
            flood a screen reader. This is a developer aid, not content. */}
        {hovered
          ? `Tile (${hovered.x}, ${hovered.y}) · level ${hovered.level}${hovered.water ? ' · water' : ''}`
          : 'Move the pointer over the picture to see which tile is under it.'}
      </figcaption>
    </figure>
  );
}
