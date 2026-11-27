import { describe, expect, it } from 'vitest';
import { animationAllowed, type AnimationPolicy } from './animationPolicy';

describe('animationAllowed', () => {
  const allowed: AnimationPolicy = {
    enabled: true,
    reducedMotion: false,
    pageVisible: true,
  };

  it('allows motion only when user, device and page visibility permit it', () => {
    expect(animationAllowed(allowed)).toBe(true);
    expect(animationAllowed({ ...allowed, enabled: false })).toBe(false);
    expect(animationAllowed({ ...allowed, reducedMotion: true })).toBe(false);
    expect(animationAllowed({ ...allowed, pageVisible: false })).toBe(false);
  });
});
