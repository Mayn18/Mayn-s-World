import { applyTheme, defaultTheme, themes, type Theme, type ThemeId } from './themes';

export const THEME_STORAGE_KEY = 'mayns-world:theme';

type ThemeStorage = Pick<Storage, 'getItem' | 'setItem'>;

let activeTheme: Theme = defaultTheme;
const listeners = new Set<() => void>();
let rebuildCounter = 0;
let lastSwitchStartedAt: number | null = null;

function browserStorage(): ThemeStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    // Storage can be disabled by the browser or privacy settings.
    return null;
  }
}

export function restoreActiveTheme(storage?: ThemeStorage): Theme {
  const savedStorage = storage ?? browserStorage();
  let restored = defaultTheme;
  if (savedStorage) {
    try {
      const id = savedStorage.getItem(THEME_STORAGE_KEY);
      if (id && Object.hasOwn(themes, id)) {
        restored = themes[id as ThemeId];
      }
    } catch {
      // The default theme remains available when saved preferences cannot be read.
    }
  }
  activeTheme = restored;
  return restored;
}

export function getActiveTheme(): Theme {
  return activeTheme;
}

export function subscribeActiveTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setActiveTheme(theme: Theme): boolean {
  if (theme === activeTheme) return false;
  activeTheme = theme;
  rebuildCounter += 1;
  lastSwitchStartedAt =
    typeof performance !== 'undefined' ? performance.now() : null;
  if (typeof document !== 'undefined') {
    applyTheme(document.documentElement, theme);
  }
  for (const listener of listeners) listener();
  return true;
}

export function setActiveThemeById(id: ThemeId, storage?: ThemeStorage): boolean {
  const theme = Object.hasOwn(themes, id) ? themes[id] : undefined;
  if (!theme) return false;
  const changed = setActiveTheme(theme);
  const savedStorage = storage ?? browserStorage();
  if (savedStorage) {
    try {
      savedStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {
      // The selection still applies for this visit when storage is unavailable.
    }
  }
  return changed;
}

export function getThemeRebuildCounter(): number {
  return rebuildCounter;
}

export function getLastThemeSwitchStartedAt(): number | null {
  return lastSwitchStartedAt;
}
