export interface PointerPanState {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  dragging: boolean;
}

export interface PointerPanMovement {
  state: PointerPanState;
  deltaX: number;
  deltaY: number;
}

export type PointerPanEndReason = 'up' | 'cancel' | 'lost-capture';

const DRAG_THRESHOLD = 4;

export function beginPointerPan(
  pointerId: number,
  button: number,
  pointerType: string,
  x: number,
  y: number,
): PointerPanState | null {
  if (
    button !== 0 ||
    pointerType !== 'mouse' ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    return null;
  }
  return { pointerId, startX: x, startY: y, lastX: x, lastY: y, dragging: false };
}

export function movePointerPan(
  gesture: PointerPanState,
  pointerId: number,
  x: number,
  y: number,
): PointerPanMovement | null {
  if (gesture.pointerId !== pointerId || !Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  if (!gesture.dragging) {
    const totalX = x - gesture.startX;
    const totalY = y - gesture.startY;
    const dragging = totalX * totalX + totalY * totalY >= DRAG_THRESHOLD ** 2;
    return {
      state: { ...gesture, lastX: x, lastY: y, dragging },
      deltaX: dragging ? totalX : 0,
      deltaY: dragging ? totalY : 0,
    };
  }

  return {
    state: { ...gesture, lastX: x, lastY: y },
    deltaX: x - gesture.lastX,
    deltaY: y - gesture.lastY,
  };
}

export function finishPointerPan(
  gesture: PointerPanState,
  pointerId: number,
  reason: PointerPanEndReason,
): boolean | null {
  if (gesture.pointerId !== pointerId) return null;
  return gesture.dragging && reason === 'up';
}
