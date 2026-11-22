import { describe, expect, it } from 'vitest';
import {
  getActiveTheme,
  getThemeRebuildCounter,
  restoreActiveTheme,
  setActiveTheme,
  setActiveThemeById,
  subscribeActiveTheme,
} from './activeTheme';
import { defaultTheme, type Theme } from './themes';

function memoryStorage(initial: string | null = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
    get value() {
      return value;
    },
  };
}

describe('active theme state', () => {
  it('defaults to Daytime Meadow and exposes subscriptions', () => {
    let notifications = 0;
    const unsubscribe = subscribeActiveTheme(() => {
      notifications += 1;
    });
    try {
      setActiveTheme(defaultTheme);
      expect(getActiveTheme()).toBe(defaultTheme);

      const before = getThemeRebuildCounter();
      expect(setActiveTheme(defaultTheme)).toBe(false);
      expect(getThemeRebuildCounter()).toBe(before);
      expect(notifications).toBe(0);

      const testTheme: Theme = {
        ...defaultTheme,
        name: 'Test Theme',
        colors: { ...defaultTheme.colors, grass: '#123456' },
        materials: { ...defaultTheme.materials },
      };
      expect(setActiveTheme(testTheme)).toBe(true);
      expect(getThemeRebuildCounter()).toBe(before + 1);
      expect(notifications).toBe(1);
      expect(setActiveTheme(testTheme)).toBe(false);
      expect(setActiveThemeById('daytime-meadow')).toBe(true);
      expect(getActiveTheme()).toBe(defaultTheme);
    } finally {
      unsubscribe();
      setActiveTheme(defaultTheme);
    }
  });

  it('removes subscriptions', () => {
    let notifications = 0;
    const unsubscribe = subscribeActiveTheme(() => {
      notifications += 1;
    });
    unsubscribe();

    const testTheme: Theme = {
      ...defaultTheme,
      name: 'Subscription Cleanup Theme',
    };
    try {
      setActiveTheme(testTheme);
      expect(notifications).toBe(0);
    } finally {
      setActiveTheme(defaultTheme);
    }
  });

  it('restores valid saved themes and falls back for invalid values', () => {
    const saved = memoryStorage('cozy-night');
    expect(restoreActiveTheme(saved)).toMatchObject({ id: 'cozy-night', name: 'Cozy Night' });

    expect(restoreActiveTheme(memoryStorage('not-a-theme'))).toBe(defaultTheme);
    expect(restoreActiveTheme(memoryStorage(null))).toBe(defaultTheme);
    expect(restoreActiveTheme({ getItem: () => { throw new Error('blocked'); }, setItem: () => {} })).toBe(defaultTheme);
    setActiveTheme(defaultTheme);
  });

  it('persists theme selections without rebuilding an already-active theme', () => {
    const storage = memoryStorage();
    const before = getThemeRebuildCounter();

    expect(setActiveThemeById('cozy-night', storage)).toBe(true);
    expect(storage.value).toBe('cozy-night');
    expect(getThemeRebuildCounter()).toBe(before + 1);
    expect(setActiveThemeById('cozy-night', storage)).toBe(false);
    expect(getThemeRebuildCounter()).toBe(before + 1);

    expect(setActiveThemeById('daytime-meadow', storage)).toBe(true);
    expect(storage.value).toBe('daytime-meadow');
  });

});
