import { applyTheme, defaultTheme, themes, type Theme, type ThemeId } from './themes';

let activeTheme: Theme = defaultTheme;
const listeners = new Set<() => void>();
let rebuildCounter = 0;
let lastSwitchStartedAt: number | null = null;

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

export function setActiveThemeById(id: ThemeId): boolean {
  const theme = themes[id];
  return theme ? setActiveTheme(theme) : false;
}

export function getThemeRebuildCounter(): number {
  return rebuildCounter;
}

export function getLastThemeSwitchStartedAt(): number | null {
  return lastSwitchStartedAt;
}
