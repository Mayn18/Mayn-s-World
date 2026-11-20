// Fitting the picture into the browser window.
//
// The terrain has a fixed shape (896 x 478 px for the current patch). The window
// can be any shape. To fill the window WITHOUT stretching the picture, scale it
// by one number, the same horizontally and vertically, and centre it. This is
// "contain" fitting, the same rule as CSS object-fit: contain.
//
//   window wider than the picture          window taller than the picture
//   +--------------------------+           +-------------+
//   |      +----------+        |           |             |
//   | sky  | picture  |  sky   |           |    sky      |
//   |      +----------+        |           | +---------+ |
//   +--------------------------+           | | picture | |
//        picture touches top                | +---------+ |
//        and bottom                         |    sky      |
//                                           +-------------+
//                                                picture touches left and right
//
// The scale is the smaller of the two ratios, because the picture has to fit in
// BOTH directions:   scale = min(windowWidth / pictureWidth, windowHeight / pictureHeight)
//
// A point on screen then maps to a point in the picture by undoing the two steps
// in reverse order: subtract the offset, divide by the scale.
//
// Pure arithmetic, no canvas and no React, so it is tested directly. It is also
// the camera's coordinate system: zoom changes its scale and offset while the
// fit remains the reference framing.
export interface ViewTransform {
  scale: number;
  // Where the picture's top-left corner lands in the window, in CSS pixels.
  offsetX: number;
  offsetY: number;
}

export interface CameraState {
  zoom: number;
  // The picture-space point at the centre of the viewport.
  centerX: number;
  centerY: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;

const MAX_WHEEL_DELTA = 240;
const WHEEL_ZOOM_SENSITIVITY = 0.0015;

export function initialCamera(contentWidth: number, contentHeight: number): CameraState {
  return {
    zoom: MIN_ZOOM,
    centerX: contentWidth / 2,
    centerY: contentHeight / 2,
  };
}

export function fitContain(
  viewWidth: number,
  viewHeight: number,
  contentWidth: number,
  contentHeight: number,
): ViewTransform {
  // A window with no size (a hidden element, a window being dragged to nothing)
  // gets a harmless zero-size result rather than NaN or Infinity.
  if (viewWidth <= 0 || viewHeight <= 0 || contentWidth <= 0 || contentHeight <= 0) {
    return { scale: 0, offsetX: 0, offsetY: 0 };
  }
  const scale = Math.min(viewWidth / contentWidth, viewHeight / contentHeight);
  return {
    scale,
    offsetX: (viewWidth - contentWidth * scale) / 2,
    offsetY: (viewHeight - contentHeight * scale) / 2,
  };
}

export function cameraView(
  fit: ViewTransform,
  viewWidth: number,
  viewHeight: number,
  camera: CameraState,
): ViewTransform {
  if (fit.scale <= 0) return fit;
  const scale = fit.scale * camera.zoom;
  return {
    scale,
    offsetX: viewWidth / 2 - camera.centerX * scale,
    offsetY: viewHeight / 2 - camera.centerY * scale,
  };
}

export function panCameraBy(
  camera: CameraState,
  fit: ViewTransform,
  deltaX: number,
  deltaY: number,
): CameraState {
  const scale = fit.scale * camera.zoom;
  if (
    scale <= 0 ||
    !Number.isFinite(deltaX) ||
    !Number.isFinite(deltaY) ||
    (deltaX === 0 && deltaY === 0)
  ) {
    return camera;
  }
  return {
    ...camera,
    centerX: camera.centerX - deltaX / scale,
    centerY: camera.centerY - deltaY / scale,
  };
}

export function zoomCameraAt(
  camera: CameraState,
  fit: ViewTransform,
  viewWidth: number,
  viewHeight: number,
  contentWidth: number,
  contentHeight: number,
  x: number,
  y: number,
  factor: number,
): CameraState {
  if (
    fit.scale <= 0 ||
    viewWidth <= 0 ||
    viewHeight <= 0 ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(factor) ||
    factor <= 0
  ) {
    return camera;
  }

  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom * factor));
  if (zoom === camera.zoom) return camera;
  if (zoom === MIN_ZOOM) return initialCamera(contentWidth, contentHeight);

  const currentView = cameraView(fit, viewWidth, viewHeight, camera);
  const focus = viewToContent(currentView, x, y);
  if (!focus) return camera;

  const scale = fit.scale * zoom;
  return {
    zoom,
    centerX: focus.x - (x - viewWidth / 2) / scale,
    centerY: focus.y - (y - viewHeight / 2) / scale,
  };
}

export function wheelDeltaToZoomFactor(
  deltaY: number,
  deltaMode: number,
  pageHeight: number,
): number | null {
  if (!Number.isFinite(deltaY) || deltaY === 0) return null;

  let pixelsPerUnit: number;
  switch (deltaMode) {
    case 0:
      pixelsPerUnit = 1;
      break;
    case 1:
      pixelsPerUnit = 16;
      break;
    case 2:
      pixelsPerUnit = Number.isFinite(pageHeight) && pageHeight > 0 ? pageHeight : 800;
      break;
    default:
      return null;
  }

  const pixels = Math.max(-MAX_WHEEL_DELTA, Math.min(MAX_WHEEL_DELTA, deltaY * pixelsPerUnit));
  return Math.exp(-pixels * WHEEL_ZOOM_SENSITIVITY);
}

// A window point (CSS pixels from the window's top-left) -> a point in the
// picture (pixels from the picture's top-left). Returns null when the picture has
// no size, since there is nothing to point at. The result may fall outside the
// picture; the caller decides what that means (the tile picker finds no tile).
export function viewToContent(
  view: ViewTransform,
  x: number,
  y: number,
): { x: number; y: number } | null {
  if (view.scale <= 0) return null;
  return { x: (x - view.offsetX) / view.scale, y: (y - view.offsetY) / view.scale };
}
