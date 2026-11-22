import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent,
} from 'react';
import {
  beginPointerPan,
  finishPointerPan as finishPointerPanGesture,
  movePointerPan,
  type PointerPanState,
  type PointerPanEndReason,
} from './interaction/pointerPan';
import { worldBounds } from './render/bounds';
import { cacheResolution } from './render/cacheResolution';
import { type PickedTile, pickTile } from './render/picking';
import { type TileRange, paintTerrain } from './render/terrainPainter';
import { terrainPalette } from './render/terrainPalette';
import {
  type CameraState,
  type ViewTransform,
  MAX_ZOOM,
  cameraView,
  fitContain,
  initialCamera,
  panCameraBy,
  viewToContent,
  wheelDeltaToZoomFactor,
  zoomCameraAt,
} from './render/viewTransform';
import { townRoadLayer } from './roads/town';
import { townModel } from './terrain/town';
import { buildScene } from './buildings/scene';
import { buildDecorLayer } from './decor/layer';
import { townBuildings, townDecor, townWalls } from './data/loader';
import { defaultTheme, type Theme } from './themes';

interface TownCanvasProps {
  theme?: Theme;
}

interface TerrainCanvasCache {
  canvas: HTMLCanvasElement;
  theme: Theme;
  scale: number;
}

interface TerrainCacheBuild extends TerrainCanvasCache {
  context: CanvasRenderingContext2D;
  nextTile: number;
  frameId: number;
}

const CACHE_BUILD_BUDGET_MS = 3;
const CACHE_BUILD_TILE_BATCH = 8;

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
// fitContain (viewTransform.ts) establishes the framing; the camera applies a
// uniform scale and offset so the terrain keeps its proportions while zooming
// and panning. The unused sky around it is the page background.
//
// ACCESSIBILITY
// The canvas shows the world and handles camera gestures; when destinations
// become interactive, they get real links positioned over the canvas. The tile
// readout is a developer aid.
export function TownCanvas({ theme = defaultTheme }: TownCanvasProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // The latest fit, kept in a ref (not state) so pointer handlers can read it
  // without re-rendering React every time the window is resized.
  const viewRef = useRef<ViewTransform>({ scale: 0, offsetX: 0, offsetY: 0 });
  const [hovered, setHovered] = useState<PickedTile | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef<PointerPanState | null>(null);
  const suppressClickRef = useRef(false);
  const redrawFrameRef = useRef<number | null>(null);
  const terrainCanvasRef = useRef<TerrainCanvasCache | null>(null);
  const terrainCacheBuildRef = useRef<TerrainCacheBuild | null>(null);
  const blockedCacheScaleRef = useRef(0);
  const drawRef = useRef<() => void>(() => {});

  // The picture's own size and where it starts in projection space. Fixed for the
  // town terrain, so worked out once.
  const scene = useMemo(() => {
    const decor = buildDecorLayer(townModel, townRoadLayer, townBuildings, townWalls, townDecor);
    return buildScene(townModel, townBuildings, townWalls, undefined, decor);
  }, []);
  const bounds = useMemo(() => worldBounds(townModel, scene.top), [scene]);
  const cameraRef = useRef<CameraState>(initialCamera(bounds.width, bounds.height));
  const fitRef = useRef<ViewTransform>({ scale: 0, offsetX: 0, offsetY: 0 });
  const viewportRef = useRef({ width: 0, height: 0 });

  const scheduleDraw = useCallback(() => {
    if (redrawFrameRef.current !== null) return;
    redrawFrameRef.current = window.requestAnimationFrame(() => {
      redrawFrameRef.current = null;
      drawRef.current();
    });
  }, []);

  const startCacheUpgrade = useCallback(
    (resolution: ReturnType<typeof cacheResolution>) => {
      const currentBuild = terrainCacheBuildRef.current;
      if (currentBuild?.theme === theme) return;
      if (resolution.scale <= blockedCacheScaleRef.current) return;

      if (currentBuild) {
        window.cancelAnimationFrame(currentBuild.frameId);
        currentBuild.canvas.width = 0;
        currentBuild.canvas.height = 0;
        terrainCacheBuildRef.current = null;
      }

      const cacheCanvas = document.createElement('canvas');
      cacheCanvas.width = resolution.width;
      cacheCanvas.height = resolution.height;
      const context = cacheCanvas.getContext('2d');
      if (!context) {
        blockedCacheScaleRef.current = resolution.scale;
        console.warn('Could not create a high-resolution town cache; keeping the current cache.');
        return;
      }
      context.setTransform(resolution.scale, 0, 0, resolution.scale, 0, 0);

      const palette = terrainPalette(theme);
      const decorate = (ctx: CanvasRenderingContext2D, x: number, y: number) =>
        scene.paintTile(ctx, x, y, theme);
      const build: TerrainCacheBuild = {
        canvas: cacheCanvas,
        context,
        theme,
        scale: resolution.scale,
        nextTile: 0,
        frameId: 0,
      };
      terrainCacheBuildRef.current = build;

      const paintNextBatch = () => {
        if (terrainCacheBuildRef.current !== build) return;
        const startedAt = performance.now();

        do {
          const range: TileRange = {
            start: build.nextTile,
            end: Math.min(build.nextTile + CACHE_BUILD_TILE_BATCH, townModel.order.length),
          };
          paintTerrain(
            build.context,
            townModel,
            palette,
            bounds,
            townRoadLayer,
            decorate,
            range,
          );
          build.nextTile = range.end;
        } while (
          build.nextTile < townModel.order.length &&
          performance.now() - startedAt < CACHE_BUILD_BUDGET_MS
        );

        if (build.nextTile === townModel.order.length) {
          const previousCache = terrainCanvasRef.current;
          terrainCanvasRef.current = { canvas: build.canvas, theme, scale: build.scale };
          terrainCacheBuildRef.current = null;
          blockedCacheScaleRef.current = 0;
          if (previousCache && previousCache.canvas !== build.canvas) {
            previousCache.canvas.width = 0;
            previousCache.canvas.height = 0;
          }
          scheduleDraw();
          return;
        }

        build.frameId = window.requestAnimationFrame(paintNextBatch);
      };

      build.frameId = window.requestAnimationFrame(paintNextBatch);
    },
    [bounds, scene, scheduleDraw, theme],
  );

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

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const fit = fitContain(cssWidth, cssHeight, bounds.width, bounds.height);
    fitRef.current = fit;
    viewportRef.current = { width: cssWidth, height: cssHeight };
    const view = cameraView(fit, cssWidth, cssHeight, cameraRef.current);
    viewRef.current = view;

    if (view.scale <= 0) return;

    const pendingBuild = terrainCacheBuildRef.current;
    if (pendingBuild && pendingBuild.theme !== theme) {
      window.cancelAnimationFrame(pendingBuild.frameId);
      pendingBuild.canvas.width = 0;
      pendingBuild.canvas.height = 0;
      terrainCacheBuildRef.current = null;
      blockedCacheScaleRef.current = 0;
    }

    let terrainCanvas = terrainCanvasRef.current;
    if (!terrainCanvas || terrainCanvas.theme !== theme) {
      blockedCacheScaleRef.current = 0;
      const cacheCanvas = document.createElement('canvas');
      cacheCanvas.width = Math.max(1, Math.ceil(bounds.width));
      cacheCanvas.height = Math.max(1, Math.ceil(bounds.height));
      const cacheContext = cacheCanvas.getContext('2d');
      if (!cacheContext) {
        setUnsupported(true);
        return;
      }

      cacheContext.setTransform(1, 0, 0, 1, 0, 0);
      paintTerrain(cacheContext, townModel, terrainPalette(theme), bounds, townRoadLayer, (c, x, y) =>
        scene.paintTile(c, x, y, theme),
      );
      terrainCanvas = { canvas: cacheCanvas, theme, scale: 1 };
      terrainCanvasRef.current = terrainCanvas;
    }

    const maxResolution = cacheResolution(bounds, fit.scale * MAX_ZOOM, dpr);
    const k = view.scale * dpr;
    ctx.setTransform(k, 0, 0, k, view.offsetX * dpr, view.offsetY * dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
      terrainCanvas.canvas,
      0,
      0,
      terrainCanvas.canvas.width,
      terrainCanvas.canvas.height,
      0,
      0,
      bounds.width,
      bounds.height,
    );
    if (terrainCanvas.scale < maxResolution.scale) startCacheUpgrade(maxResolution);
  }, [bounds, scene, startCacheUpgrade, theme]);
  drawRef.current = draw;

  // Draw once the canvas exists, and redraw whenever its box changes size. The
  // ResizeObserver covers window resizes, rotating a phone and browser UI such as
  // a mobile address bar showing or hiding; the window listener additionally
  // catches a change of devicePixelRatio (browser zoom, moving to another screen).
  useEffect(() => {
    draw();
    const box = boxRef.current;
    const canvas = canvasRef.current;
    const observer = box ? new ResizeObserver(draw) : null;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = wheelDeltaToZoomFactor(event.deltaY, event.deltaMode, window.innerHeight);
      if (factor === null || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const viewport = viewportRef.current;
      const nextCamera = zoomCameraAt(
        cameraRef.current,
        fitRef.current,
        viewport.width,
        viewport.height,
        bounds.width,
        bounds.height,
        event.clientX - rect.left,
        event.clientY - rect.top,
        factor,
      );
      if (nextCamera === cameraRef.current) return;

      cameraRef.current = nextCamera;
      viewRef.current = cameraView(
        fitRef.current,
        viewport.width,
        viewport.height,
        nextCamera,
      );
      scheduleDraw();
    };

    if (box) observer?.observe(box);
    window.addEventListener('resize', draw);
    canvas?.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', draw);
      canvas?.removeEventListener('wheel', handleWheel);
      const cacheBuild = terrainCacheBuildRef.current;
      if (cacheBuild) {
        window.cancelAnimationFrame(cacheBuild.frameId);
        cacheBuild.canvas.width = 0;
        cacheBuild.canvas.height = 0;
        terrainCacheBuildRef.current = null;
      }
      if (redrawFrameRef.current !== null) {
        window.cancelAnimationFrame(redrawFrameRef.current);
        redrawFrameRef.current = null;
      }
    };
  }, [bounds.height, bounds.width, draw, scheduleDraw]);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const gesture = beginPointerPan(
      event.pointerId,
      event.button,
      event.pointerType,
      event.clientX,
      event.clientY,
    );
    if (!gesture) return;

    panRef.current = gesture;
  }

  function handlePanPointerMove(event: PointerEvent<HTMLDivElement>) {
    const gesture = panRef.current;
    if (!gesture) return;
    const movement = movePointerPan(
      gesture,
      event.pointerId,
      event.clientX,
      event.clientY,
    );
    if (!movement) return;

    panRef.current = movement.state;
    if (!movement.state.dragging) return;

    if (!gesture.dragging) event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
    setIsPanning(true);
    setHovered(null);
    const viewport = viewportRef.current;
    const camera = panCameraBy(
      cameraRef.current,
      fitRef.current,
      movement.deltaX,
      movement.deltaY,
    );
    cameraRef.current = camera;
    viewRef.current = cameraView(
      fitRef.current,
      viewport.width,
      viewport.height,
      camera,
    );
    scheduleDraw();
  }

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

  function finishPointerGesture(
    event: PointerEvent<HTMLDivElement>,
    reason: PointerPanEndReason,
  ) {
    const gesture = panRef.current;
    if (!gesture) return;
    const suppressClick = finishPointerPanGesture(gesture, event.pointerId, reason);
    if (suppressClick === null) return;

    panRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (suppressClick) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  }

  function handleClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  if (unsupported) {
    return <p className="world-fallback">This browser could not draw the world.</p>;
  }

  return (
    <div
      ref={boxRef}
      className={isPanning ? 'world-box is-panning' : 'world-box'}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePanPointerMove}
      onPointerUp={(event) => finishPointerGesture(event, 'up')}
      onPointerCancel={(event) => finishPointerGesture(event, 'cancel')}
      onLostPointerCapture={(event) => finishPointerGesture(event, 'lost-capture')}
      onClickCapture={handleClickCapture}
    >
      <canvas
        ref={canvasRef}
        className={isPanning ? 'world-canvas is-panning' : 'world-canvas'}
        role="img"
        aria-label={`The town's terrain, ${townModel.terrain.width} by ${townModel.terrain.height} tiles: a castle hill in the north, terraced town, cliffs, a winding river and surrounding farmland, with its streets, lanes, paths, stairs and bridges. The town fills it: a castle on the hill, about ninety houses, shops and farm buildings, a market square with a fountain, forests, fields and the six destination buildings. Scroll to zoom; drag with the left mouse button to pan.`}
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHovered(null)}
      />
      {/* Not aria-live: a readout that changes on every mouse move would flood a
          screen reader. This is a developer aid, not content. */}
      <p className="world-readout">
        {hovered
          ? `Tile (${hovered.x}, ${hovered.y}) · level ${hovered.level}${hovered.water ? ' · water' : ''}`
          : 'Move the pointer over the ground · Scroll to zoom · Drag to pan'}
      </p>
    </div>
  );
}
