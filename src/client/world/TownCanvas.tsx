import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { ART } from './bake/space';
import { type PickedTile, pickTile } from './render/picking';
import { townBitmap } from './townBitmap';
import { type ViewTransform, fitContain, viewToContent } from './render/viewTransform';
import { townModel } from './terrain/town';
import { defaultTheme, type Theme } from './themes';

interface TownCanvasProps {
  theme?: Theme;
}

// The whole 80 x 60 town terrain, filling whatever box it is placed in (the page gives it the whole
// browser window; see .world-viewport in styles.css).
//
// React's job is small: own the <canvas>, notice when its box changes size, and
// say when to draw. The real work lives in plain modules that know nothing about
// React (projection, depth, painter, view transform).
//
// SIZE AND SHARPNESS
// Two sizes matter and they are different on purpose:
//   - the CSS size of the canvas: the box it fills, in CSS pixels (e.g. 1440 x 900)
//   - the drawing buffer: that size multiplied by devicePixelRatio, so a phone or
//     laptop with a dense screen gets one buffer pixel per real screen pixel and
//     the picture is sharp instead of blurry
// Drawing is then scaled and centred by fitContain (viewTransform.ts) so the
// terrain keeps its proportions whatever shape the window is. The unused sky
// around it is the page background, not part of the canvas drawing.
//
// ACCESSIBILITY
// The canvas is an illustration (role="img"), not a control. Nothing in the world
// is interactive yet; when destinations become buildings they get real links
// positioned over the canvas. The tile readout is a developer aid.
export function TownCanvas({ theme = defaultTheme }: TownCanvasProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The latest fit, kept in a ref (not state) so pointer handlers can read it
  // without re-rendering React every time the window is resized.
  const viewRef = useRef<ViewTransform>({ scale: 0, offsetX: 0, offsetY: 0 });
  const [hovered, setHovered] = useState<PickedTile | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  // The baked town and its size. Drawn once (see townBitmap.ts); everything after
  // that is just showing the same bitmap, scaled.
  const bitmap = useMemo(() => townBitmap(theme), [theme]);
  const bounds = bitmap?.bounds ?? { left: 0, top: 0, width: 1, height: 1 };

  const draw = useCallback(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setUnsupported(true);
      return;
    }

    const cssWidth = box.clientWidth;
    const cssHeight = box.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    // Setting width or height clears the canvas and resets its transform, so only
    // do it when the size really changed.
    const bufferWidth = Math.max(1, Math.round(cssWidth * dpr));
    const bufferHeight = Math.max(1, Math.round(cssHeight * dpr));
    if (canvas.width !== bufferWidth) canvas.width = bufferWidth;
    if (canvas.height !== bufferHeight) canvas.height = bufferHeight;

    const view = fitContain(cssWidth, cssHeight, bounds.width, bounds.height);
    viewRef.current = view;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (view.scale <= 0) return;

    // From here every coordinate is in picture pixels: the transform scales them
    // to CSS pixels (view.scale), then to buffer pixels (dpr), and moves the
    // picture to its centred spot. paintTerrain is unchanged from the fixed-size
    // version; it simply draws into a scaled space.
    const k = view.scale * dpr;
    ctx.setTransform(k, 0, 0, k, view.offsetX * dpr, view.offsetY * dpr);
    if (!bitmap) return;
    // Hard pixel edges when zoomed in; smooth when the picture is shrunk to fit,
    // where nearest-neighbour would look jagged and lose detail.
    ctx.imageSmoothingEnabled = k < ART;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap.canvas, 0, 0, bounds.width, bounds.height);
  }, [bitmap, bounds]);

  // Draw once the canvas exists, and redraw whenever its box changes size. The
  // ResizeObserver covers window resizes, rotating a phone and browser UI such as
  // a mobile address bar showing or hiding; the window listener additionally
  // catches a change of devicePixelRatio (browser zoom, moving to another screen).
  useEffect(() => {
    draw();
    const box = boxRef.current;
    const observer = box ? new ResizeObserver(draw) : null;
    if (box) observer?.observe(box);
    window.addEventListener('resize', draw);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', draw);
    };
  }, [draw]);

  // Window position -> picture pixel (undo the fit) -> projection space (add the
  // picture's origin) -> tile.
  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const inPicture = viewToContent(
      viewRef.current,
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
    const picked = inPicture
      ? pickTile(townModel, inPicture.x + bounds.left, inPicture.y + bounds.top)
      : null;
    // Only update state when the tile changes, to avoid re-rendering on every
    // pixel of movement.
    setHovered((previous) =>
      previous?.x === picked?.x && previous?.y === picked?.y ? previous : picked,
    );
  }

  if (unsupported) {
    return <p className="world-fallback">This browser could not draw the world.</p>;
  }

  return (
    <div ref={boxRef} className="world-box">
      <canvas
        ref={canvasRef}
        className="world-canvas"
        role="img"
        aria-label={`The town's terrain, ${townModel.terrain.width} by ${townModel.terrain.height} tiles: a castle hill in the north, terraced town, cliffs, a winding river and surrounding farmland. Buildings are not drawn yet.`}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHovered(null)}
      />
      {/* Not aria-live: a readout that changes on every mouse move would flood a
          screen reader. This is a developer aid, not content. */}
      <p className="world-readout">
        {hovered
          ? `Tile (${hovered.x}, ${hovered.y}) · level ${hovered.level}${hovered.water ? ' · water' : ''}`
          : 'Town terrain (no buildings yet) · move the pointer over the ground'}
      </p>
    </div>
  );
}
