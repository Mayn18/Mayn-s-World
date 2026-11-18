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
// the seed of the camera: zooming and panning later change the scale and offset
// instead of computing them from the window.
export interface ViewTransform {
  scale: number;
  // Where the picture's top-left corner lands in the window, in CSS pixels.
  offsetX: number;
  offsetY: number;
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
