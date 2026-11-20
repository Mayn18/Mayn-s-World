import { describe, expect, it } from 'vitest';
import { beginPointerPan, finishPointerPan, movePointerPan } from './pointerPan';

describe('pointer pan gesture', () => {
  it('starts only for a left-button mouse press with finite coordinates', () => {
    expect(beginPointerPan(1, 0, 'mouse', 10, 20)).toMatchObject({
      pointerId: 1,
      dragging: false,
    });
    expect(beginPointerPan(1, 1, 'mouse', 10, 20)).toBeNull();
    expect(beginPointerPan(1, 0, 'touch', 10, 20)).toBeNull();
    expect(beginPointerPan(1, 0, 'mouse', Number.NaN, 20)).toBeNull();
  });

  it('keeps a small movement as a click and starts panning after meaningful movement', () => {
    const start = beginPointerPan(7, 0, 'mouse', 10, 20)!;
    const clickMovement = movePointerPan(start, 7, 12, 21)!;
    expect(clickMovement.state.dragging).toBe(false);
    expect(clickMovement.deltaX).toBe(0);
    expect(finishPointerPan(clickMovement.state, 7, 'up')).toBe(false);

    const dragMovement = movePointerPan(clickMovement.state, 7, 14, 21)!;
    expect(dragMovement.state.dragging).toBe(true);
    expect(dragMovement.deltaX).toBe(4);
    expect(dragMovement.deltaY).toBe(1);
    expect(finishPointerPan(dragMovement.state, 7, 'up')).toBe(true);
  });

  it('continues tracking outside the canvas and reports only its own pointer', () => {
    const start = beginPointerPan(3, 0, 'mouse', 10, 20)!;
    const begun = movePointerPan(start, 3, 14, 20)!.state;
    const outside = movePointerPan(begun, 3, -100, 900)!;
    expect(outside).toMatchObject({ deltaX: -114, deltaY: 880 });
    expect(movePointerPan(outside.state, 4, 0, 0)).toBeNull();
    expect(finishPointerPan(outside.state, 4, 'up')).toBeNull();
    expect(finishPointerPan(outside.state, 3, 'up')).toBe(true);
  });

  it('suppresses clicks after a drag only when released, not cancelled', () => {
    const click = beginPointerPan(1, 0, 'mouse', 0, 0)!;
    expect(finishPointerPan(click, 1, 'up')).toBe(false);

    const start = beginPointerPan(2, 0, 'mouse', 0, 0)!;
    const drag = movePointerPan(start, 2, 5, 0)!.state;
    expect(finishPointerPan(drag, 2, 'up')).toBe(true);
    expect(finishPointerPan(drag, 2, 'cancel')).toBe(false);
    expect(finishPointerPan(drag, 2, 'lost-capture')).toBe(false);
  });
});
