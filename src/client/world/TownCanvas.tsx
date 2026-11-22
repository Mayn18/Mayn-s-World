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
import { mix, terrainPalette } from './render/terrainPalette';
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
import { defaultTheme, themes, type Theme, type ThemeId } from './themes';
import {
  getActiveTheme,
  getLastThemeSwitchStartedAt,
  getThemeRebuildCounter,
  setActiveTheme,
} from './activeTheme';
import { AmbientScheduler } from './ambient/animationScheduler';
import type { MotionSetting } from './ambient/useAmbientMotion';
import { buildAmbientScene } from './ambient/ambientScene';
import { paintAmbientBase } from './ambient/ambientPainter';
import { buildWaterEffectScene } from './ambient/waterEffects';
import { buildingPalette } from './buildings/palette';

interface TownCanvasProps {
  theme?: Theme;
  motion?: MotionSetting;
  reducedMotion?: boolean;
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

interface ThemeCacheMetrics {
  oneXMs: number[];
  upgradeMs: number[];
  oneXBytes: number;
  highTierBytes: number;
}

function createThemeCacheMetrics(): Record<ThemeId, ThemeCacheMetrics> {
  return Object.values(themes).reduce((metrics, theme) => {
    metrics[theme.id] = { oneXMs: [], upgradeMs: [], oneXBytes: 0, highTierBytes: 0 };
    return metrics;
  }, {} as Record<ThemeId, ThemeCacheMetrics>);
}

function releaseCacheCanvas(cache: TerrainCanvasCache | TerrainCacheBuild | null): void {
  if (cache) {
    cache.canvas.width = 0;
    cache.canvas.height = 0;
  }
}

function fnv1a(canvas: HTMLCanvasElement): number {
  const context = canvas.getContext('2d');
  if (!context) return 0;
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  let hash = 0x811c9dc5;
  for (let i = 0; i < pixels.length; i += 1) {
    hash ^= pixels[i]!;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const devTestTheme: Theme = import.meta.env.DEV
  ? {
      ...defaultTheme,
      id: 'daytime-meadow',
      name: 'M1 Dev Test',
      colors: {
        ...defaultTheme.colors,
        skyTop: '#321d5c',
        skyMid: '#633a78',
        skyLow: '#c06c84',
        grass: '#7b3f91',
        grassLight: '#a64d9d',
        grassDark: '#4a285f',
        hillFar: '#8b477d',
        hillNear: '#5d365f',
        path: '#7d668f',
        pathEdge: '#5c4c6c',
        leaf: '#6f2f77',
        leafLight: '#a84aa2',
        leafDark: '#44205c',
        glass: '#ef7bb8',
        wall: '#f3bda9',
        wallShade: '#bd7e88',
        stone: '#77708d',
      },
      materials: {
        ...defaultTheme.materials,
        wallCream: '#e2a8aa',
        wallSand: '#a88b9d',
        wallPlaster: '#f0b7aa',
        wallBrick: '#9b4168',
        wallStone: '#77708d',
        roofRed: '#8f3f76',
        roofBrown: '#6c365c',
        roofSlate: '#51406f',
        roofBlue: '#5b487c',
        roofGreen: '#6d477d',
        roofTeal: '#6d477d',
        roofOrange: '#a65a88',
        roofThatch: '#a98b76',
      },
    }
  : defaultTheme;

// Dev-only preview parameter sets. Every colour is mixed from the Daytime theme,
// so no new base colour enters the codebase and the production build (where
// `import.meta.env.DEV` is false) drops the whole object.
const devPreviewThemes: Record<'dusk' | 'night' | 'overcast', Theme> = import.meta.env.DEV
  ? (() => {
      const c = defaultTheme.colors;
      const m = defaultTheme.materials;
      const dusk: Theme = {
        ...defaultTheme,
        name: 'M2 Preview - Long Shadow Dusk',
        colors: {
          ...c,
          skyTop: mix(c.skyTop, c.outline, 0.32),
          skyMid: mix(c.skyMid, c.flowerYellow, 0.28),
          skyLow: mix(c.skyLow, c.flowerYellow, 0.38),
        },
        shadow: {
          color: mix(c.outline, c.glass, 0.25),
          opacity: 0.38,
          lengthScale: 1.35,
          edgeSteps: 2,
        },
      };
      const night: Theme = {
        ...defaultTheme,
        name: 'M2 Preview - Night Luminance Floor',
        colors: {
          ...c,
          skyTop: mix(c.skyTop, c.outline, 0.82),
          skyMid: mix(c.skyMid, c.outline, 0.72),
          skyLow: mix(c.skyLow, c.outline, 0.58),
          grass: mix(c.grass, c.outline, 0.45),
          grassLight: mix(c.grassLight, c.outline, 0.42),
          grassDark: mix(c.grassDark, c.outline, 0.4),
          // A floor on stone and plaster keeps both legible after dark.
          stone: mix(c.stone, c.outline, 0.18),
          wall: mix(c.wall, c.outline, 0.22),
        },
        materials: {
          ...m,
          wallPlaster: mix(m.wallPlaster, c.outline, 0.2),
          wallStone: mix(m.wallStone, c.outline, 0.22),
          roofSlate: mix(m.roofSlate, c.outline, 0.15),
        },
        shadow: {
          color: mix(c.outline, c.glass, 0.1),
          opacity: 0.44,
          lengthScale: 0.7,
          edgeSteps: 2,
        },
      };
      const overcast: Theme = {
        ...defaultTheme,
        name: 'M2 Preview - Overcast',
        colors: {
          ...c,
          skyTop: mix(c.skyTop, c.stone, 0.5),
          skyMid: mix(c.skyMid, c.stone, 0.45),
          skyLow: mix(c.skyLow, c.stone, 0.4),
          grass: mix(c.grass, c.stone, 0.28),
          grassLight: mix(c.grassLight, c.stone, 0.25),
          grassDark: mix(c.grassDark, c.stone, 0.25),
        },
        shadow: {
          color: mix(c.outline, c.stone, 0.35),
          opacity: 0.22,
          lengthScale: 0.55,
          edgeSteps: 1,
        },
      };
      return { dusk, night, overcast };
    })()
  : { dusk: defaultTheme, night: defaultTheme, overcast: defaultTheme };

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
export function TownCanvas({
  theme = defaultTheme,
  motion = 'on',
  reducedMotion = false,
}: TownCanvasProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
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
  const actorBuffersRef = useRef<HTMLCanvasElement[]>([]);
  const blockedCacheScaleRef = useRef(0);
  const drawRef = useRef<() => void>(() => {});
  const ambientDrawRef = useRef<() => void>(() => {});
  const devMetricsRef = useRef({
    coldBuildMs: [] as number[],
    upgradeWallMs: [] as number[],
    upgradeSlices: [] as number[],
    switchToOneMs: [] as number[],
    switchToUpgradeMs: [] as number[],
    parityChecksum: null as number | null,
    parityTheme: null as Theme | null,
    rebuilds: 0,
    peakOffscreenBytes: 0,
    themeBuilds: createThemeCacheMetrics(),
  });

  // The picture's own size and where it starts in projection space. Fixed for the
  // town terrain, so worked out once.
  const scene = useMemo(() => {
    const decor = buildDecorLayer(townModel, townRoadLayer, townBuildings, townWalls, townDecor);
    return buildScene(townModel, townBuildings, townWalls, undefined, decor);
  }, []);
  const ambientScene = useMemo(
    () => buildAmbientScene(townModel, townRoadLayer, scene, townDecor),
    [scene],
  );
  const cachePaintOptions = useMemo(
    () => ({
      animatedStatic: false,
      movingFigureTiles: ambientScene.movingFigureTiles,
      movingAnimalPropIds: ambientScene.movingAnimalPropIds,
    }),
    [ambientScene],
  );
  const waterEffects = useMemo(() => buildWaterEffectScene(townModel, townRoadLayer), []);
  const ambientPalette = useMemo(() => buildingPalette(theme), [theme]);
  const ambientTerrain = useMemo(() => terrainPalette(theme), [theme]);
  const bounds = useMemo(() => worldBounds(townModel, scene.top), [scene]);
  const cameraRef = useRef<CameraState>(initialCamera(bounds.width, bounds.height));
  const fitRef = useRef<ViewTransform>({ scale: 0, offsetX: 0, offsetY: 0 });
  const viewportRef = useRef({ width: 0, height: 0 });

  const drawAmbientFrame = useCallback(
    (time: number, animated: boolean) => {
      const box = boxRef.current;
      const canvas = overlayCanvasRef.current;
      if (!box || !canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(box.clientWidth * dpr));
      const height = Math.max(1, Math.round(box.clientHeight * dpr));
      const hardwareConcurrency = navigator.hardwareConcurrency || 8;
      const deviceFactor = (hardwareConcurrency <= 4 ? 0.65 : 1) * (dpr >= 3 ? 0.75 : 1);
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const view = viewRef.current;
      if (view.scale <= 0) return;
      const scale = view.scale * dpr;
      ctx.setTransform(scale, 0, 0, scale, view.offsetX * dpr, view.offsetY * dpr);
      ctx.translate(-bounds.left, -bounds.top);
      ctx.imageSmoothingEnabled = false;
      while (actorBuffersRef.current.length < ambientScene.walkers.length + ambientScene.animals.length) {
        const buffer = document.createElement('canvas');
        buffer.width = 64;
        buffer.height = 64;
        actorBuffersRef.current.push(buffer);
      }
      paintAmbientBase(
        ctx,
        ambientScene,
        waterEffects,
        scene,
        townModel,
        theme,
        ambientPalette,
        ambientTerrain,
        actorBuffersRef.current,
        cachePaintOptions,
        time,
        animated,
        view.scale,
        box.clientWidth,
        box.clientHeight,
        dpr,
        deviceFactor,
      );
    },
    [ambientPalette, ambientScene, ambientTerrain, bounds.left, bounds.top, cachePaintOptions, scene, theme, waterEffects],
  );

  useEffect(() => {
    const box = boxRef.current;
    const canvas = overlayCanvasRef.current;
    if (!box || !canvas) return;
    const scheduler = new AmbientScheduler(drawAmbientFrame);
    ambientDrawRef.current = () => scheduler.renderCurrent();

    const policy = () => ({
      enabled: motion === 'on',
      reducedMotion,
      pageVisible: !document.hidden,
    });
    const syncSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.round(box.clientWidth * dpr));
      const height = Math.max(1, Math.round(box.clientHeight * dpr));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      scheduler.renderCurrent();
    };
    const handleVisibility = () => scheduler.setPolicy(policy());
    const observer = new ResizeObserver(syncSize);
    observer.observe(box);
    window.addEventListener('resize', syncSize);
    document.addEventListener('visibilitychange', handleVisibility);
    syncSize();
    scheduler.setPolicy(policy());

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncSize);
      document.removeEventListener('visibilitychange', handleVisibility);
      scheduler.dispose();
      ambientDrawRef.current = () => {};
      canvas.width = 0;
      canvas.height = 0;
    };
  }, [drawAmbientFrame, motion, reducedMotion]);

  useEffect(() => () => {
    for (const buffer of actorBuffersRef.current) {
      buffer.width = 0;
      buffer.height = 0;
    }
    actorBuffersRef.current = [];
  }, []);

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
        releaseCacheCanvas(currentBuild);
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
      if (import.meta.env.DEV) {
        const low = terrainCanvasRef.current;
        const lowBytes = low
          ? low.canvas.width * low.canvas.height * 4
          : 0;
        const highBytes = cacheCanvas.width * cacheCanvas.height * 4;
        devMetricsRef.current.peakOffscreenBytes =
          Math.max(devMetricsRef.current.peakOffscreenBytes, lowBytes + highBytes);
      }

      const palette = terrainPalette(theme);
      const decorate = (ctx: CanvasRenderingContext2D, x: number, y: number) =>
        scene.paintTile(ctx, x, y, theme, cachePaintOptions);
      const build: TerrainCacheBuild = {
        canvas: cacheCanvas,
        context,
        theme,
        scale: resolution.scale,
        nextTile: 0,
        frameId: 0,
      };
      terrainCacheBuildRef.current = build;
      const upgradeStartedAt =
        import.meta.env.DEV ? performance.now() : 0;
      let upgradeSlices = 0;

      const paintNextBatch = () => {
        if (terrainCacheBuildRef.current !== build) return;
        if (getActiveTheme() !== build.theme) {
          terrainCacheBuildRef.current = null;
          releaseCacheCanvas(build);
          blockedCacheScaleRef.current = 0;
          return;
        }
        const startedAt = performance.now();
        upgradeSlices += 1;

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
          if (getActiveTheme() !== build.theme) {
            terrainCacheBuildRef.current = null;
            releaseCacheCanvas(build);
            blockedCacheScaleRef.current = 0;
            return;
          }
          const previousCache = terrainCanvasRef.current;
          terrainCanvasRef.current = { canvas: build.canvas, theme, scale: build.scale };
          terrainCacheBuildRef.current = null;
          blockedCacheScaleRef.current = 0;
          if (previousCache && previousCache.canvas !== build.canvas) {
            releaseCacheCanvas(previousCache);
          }
          if (import.meta.env.DEV) {
            const elapsed = performance.now() - upgradeStartedAt;
            devMetricsRef.current.upgradeWallMs.push(elapsed);
            devMetricsRef.current.upgradeSlices.push(upgradeSlices);
            const themeMetrics = devMetricsRef.current.themeBuilds[theme.id];
            themeMetrics.upgradeMs.push(elapsed);
            themeMetrics.highTierBytes = build.canvas.width * build.canvas.height * 4;
            const switchStart = getLastThemeSwitchStartedAt();
            if (switchStart !== null) {
              devMetricsRef.current.switchToUpgradeMs.push(performance.now() - switchStart);
            }
            console.info(
              '[MaynsWorld:M1] high cache upgrade',
              { ms: elapsed, slices: upgradeSlices, width: build.canvas.width, height: build.canvas.height, bytes: build.canvas.width * build.canvas.height * 4, theme: theme.id },
            );
          }
          scheduleDraw();
          return;
        }

        build.frameId = window.requestAnimationFrame(paintNextBatch);
      };

      build.frameId = window.requestAnimationFrame(paintNextBatch);
    },
    [bounds, cachePaintOptions, scene, scheduleDraw, theme],
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
      releaseCacheCanvas(pendingBuild);
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

      const buildStartedAt =
        import.meta.env.DEV ? performance.now() : 0;
      cacheContext.setTransform(1, 0, 0, 1, 0, 0);
      try {
        paintTerrain(cacheContext, townModel, terrainPalette(theme), bounds, townRoadLayer, (c, x, y) =>
          scene.paintTile(c, x, y, theme, cachePaintOptions),
        );
      } catch (error) {
        releaseCacheCanvas({ canvas: cacheCanvas, theme, scale: 1 });
        console.warn('Could not rebuild the town cache; keeping the existing cache.', error);
        scheduleDraw();
        return;
      }
      if (terrainCanvas) {
        releaseCacheCanvas(terrainCanvas);
      }
      terrainCanvas = { canvas: cacheCanvas, theme, scale: 1 };
      terrainCanvasRef.current = terrainCanvas;
      if (import.meta.env.DEV) {
        const elapsed = performance.now() - buildStartedAt;
        devMetricsRef.current.coldBuildMs.push(elapsed);
        const themeMetrics = devMetricsRef.current.themeBuilds[theme.id];
        themeMetrics.oneXMs.push(elapsed);
        devMetricsRef.current.rebuilds = getThemeRebuildCounter();
        const checksum = fnv1a(cacheCanvas);
        devMetricsRef.current.parityChecksum = checksum;
        devMetricsRef.current.parityTheme = theme;
        const switchStart = getLastThemeSwitchStartedAt();
        if (switchStart !== null) {
          devMetricsRef.current.switchToOneMs.push(performance.now() - switchStart);
        }
        const bytes = cacheCanvas.width * cacheCanvas.height * 4;
        themeMetrics.oneXBytes = bytes;
        devMetricsRef.current.peakOffscreenBytes =
          Math.max(devMetricsRef.current.peakOffscreenBytes, bytes);
        console.info(
          '[MaynsWorld:M1] 1x cache built',
          { ms: elapsed, width: cacheCanvas.width, height: cacheCanvas.height, bytes, checksum, theme: theme.id },
        );
        if (theme === defaultTheme) {
          console.info('[MaynsWorld:M1] baseline parity', checksum);
        }
        window.requestAnimationFrame(() => {
          const start = getLastThemeSwitchStartedAt();
          if (start !== null) {
            // The array is already recorded at swap; this RAF marker confirms presentation.
          }
        });
      }
    }

    const maxResolution = cacheResolution(bounds, fit.scale * MAX_ZOOM, dpr);
    const k = view.scale * dpr;
    ctx.setTransform(k, 0, 0, k, view.offsetX * dpr, view.offsetY * dpr);
    ctx.imageSmoothingEnabled = false;
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
    ambientDrawRef.current();
  }, [bounds, cachePaintOptions, scene, startCacheUpgrade, theme]);
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

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const medians = (values: number[]) => {
      if (values.length === 0) return { median: 0, min: 0, max: 0 };
      const sorted = [...values].sort((a, b) => a - b);
      const middle = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0
        ? (sorted[middle - 1]! + sorted[middle]!) / 2
        : sorted[middle]!;
      return { median, min: sorted[0]!, max: sorted[sorted.length - 1]! };
    };

    const api = {
      switchTestTheme: () => setActiveTheme(devTestTheme),
      switchDaytime: () => setActiveTheme(defaultTheme),
      switchPreview: (preview: 'dusk' | 'night' | 'overcast') =>
        setActiveTheme(devPreviewThemes[preview]),
      repeatThemeSwitches: (count: number) => {
        const repeats = Math.max(0, Math.min(100, Math.floor(count)));
        for (let i = 0; i < repeats; i += 1) {
          setActiveTheme(i % 2 === 0 ? devTestTheme : defaultTheme);
        }
      },
      raceThemeSwitches: () => {
        setActiveTheme(devTestTheme);
        setActiveTheme(defaultTheme);
        setActiveTheme(devTestTheme);
      },
      resetMetrics: () => {
        devMetricsRef.current.coldBuildMs = [];
        devMetricsRef.current.upgradeWallMs = [];
        devMetricsRef.current.upgradeSlices = [];
        devMetricsRef.current.switchToOneMs = [];
        devMetricsRef.current.switchToUpgradeMs = [];
        devMetricsRef.current.themeBuilds = createThemeCacheMetrics();
        devMetricsRef.current.rebuilds = getThemeRebuildCounter();
        devMetricsRef.current.peakOffscreenBytes = 0;
      },
      getMetrics: () => {
        const cache = terrainCanvasRef.current;
        const build = terrainCacheBuildRef.current;
        const liveCacheCount =
          (cache ? 1 : 0) + (build ? 1 : 0);
        const liveBytes =
          (cache ? cache.canvas.width * cache.canvas.height * 4 : 0) +
          (build ? build.canvas.width * build.canvas.height * 4 : 0);
        if (cache) {
          devMetricsRef.current.peakOffscreenBytes =
            Math.max(devMetricsRef.current.peakOffscreenBytes, liveBytes);
        }
        return {
          activeThemeId: getActiveTheme().id,
          activeThemeName: getActiveTheme().name,
          rebuildCounter: getThemeRebuildCounter(),
          liveCacheCount,
          liveBytes,
          peakOffscreenBytes: devMetricsRef.current.peakOffscreenBytes,
          coldBuild: medians(devMetricsRef.current.coldBuildMs),
          upgradeWall: medians(devMetricsRef.current.upgradeWallMs),
          upgradeSlices: medians(devMetricsRef.current.upgradeSlices),
          switchToOne: medians(devMetricsRef.current.switchToOneMs),
          switchToUpgrade: medians(devMetricsRef.current.switchToUpgradeMs),
          themeBuilds: Object.fromEntries(
            Object.entries(devMetricsRef.current.themeBuilds).map(([id, metrics]) => [
              id,
              {
                oneX: medians(metrics.oneXMs),
                upgrade: medians(metrics.upgradeMs),
                oneXBytes: metrics.oneXBytes,
                highTierBytes: metrics.highTierBytes,
              },
            ]),
          ),
          parityChecksum: devMetricsRef.current.parityChecksum,
          tier: cache
            ? {
                width: cache.canvas.width,
                height: cache.canvas.height,
                scale: cache.scale,
                bytes: cache.canvas.width * cache.canvas.height * 4,
              }
            : null,
        };
      },
    };
    const devWindow = window as typeof window & {
      __maynsWorldM1?: typeof api;
      __maynsWorldM2?: {
        switchPreview: (preview: 'dusk' | 'night' | 'overcast') => boolean;
      };
    };
    devWindow.__maynsWorldM1 = api;
    devWindow.__maynsWorldM2 = {
      switchPreview: (preview) => setActiveTheme(devPreviewThemes[preview]),
    };
    return () => {
      delete devWindow.__maynsWorldM1;
      delete devWindow.__maynsWorldM2;
    };
  }, []);

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
      <canvas
        ref={overlayCanvasRef}
        className="world-animation-overlay"
        aria-hidden="true"
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
