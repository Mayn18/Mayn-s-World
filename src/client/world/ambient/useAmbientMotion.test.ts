import { describe, expect, it, vi } from 'vitest';
import {
  loadMotionSetting,
  nextMotionSetting,
  prefersReducedMotion,
  saveMotionSetting,
  watchPageVisibility,
  watchReducedMotion,
} from './useAmbientMotion';

function memoryStorage(initial: string | null = null) {
  let value = initial;
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, next: string) => {
      value = next;
    }),
    get value() {
      return value;
    },
  };
}

describe('ambient motion preferences', () => {
  it('loads, toggles and persists the setting while keeping a device-locked setting unchanged', () => {
    const storage = memoryStorage('off');
    expect(loadMotionSetting(storage)).toBe('off');
    expect(nextMotionSetting('off', false)).toBe('on');
    expect(nextMotionSetting('on', true)).toBe('on');

    saveMotionSetting(nextMotionSetting('off', false), storage);
    expect(storage.value).toBe('on');
    expect(storage.setItem).toHaveBeenCalledWith('mayns-world:ambient-motion', 'on');
    expect(loadMotionSetting(memoryStorage('invalid'))).toBe('on');
    expect(loadMotionSetting({ getItem: () => { throw new Error('blocked'); }, setItem: () => {} })).toBe('on');
  });

  it('responds to reduced-motion changes and removes its listener on cleanup', () => {
    const listeners = new Set<() => void>();
    let matches = false;
    const media = {
      get matches() {
        return matches;
      },
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    };
    const update = vi.fn();
    const cleanup = watchReducedMotion(media, update);

    expect(prefersReducedMotion(media)).toBe(false);
    matches = true;
    for (const listener of listeners) listener();
    expect(update).toHaveBeenCalledWith(true);
    cleanup();
    expect(listeners.size).toBe(0);
  });

  it('tracks tab visibility and removes its listener on cleanup', () => {
    const listeners = new Set<() => void>();
    const attributes = new Set<string>();
    let hidden = false;
    const page = {
      get hidden() {
        return hidden;
      },
      addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
    };
    const element = {
      toggleAttribute: (name: string, force: boolean) => {
        if (force) attributes.add(name);
        else attributes.delete(name);
        return force;
      },
    };
    const cleanup = watchPageVisibility(page, element);

    expect(attributes.has('data-page-hidden')).toBe(false);
    hidden = true;
    for (const listener of listeners) listener();
    expect(attributes.has('data-page-hidden')).toBe(true);
    cleanup();
    expect(listeners.size).toBe(0);
  });
});
