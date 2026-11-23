import { useCallback, useEffect, useState } from 'react';

// The visitor's choice about ambient animation (drifting clouds, swaying
// flowers). The animations themselves are CSS in styles.css; this hook only
// sets two attributes on <html> that the CSS looks at:
//
//   data-motion="on" | "off"   the visitor's setting
//   data-page-hidden           present while the tab is in the background,
//                              which pauses the animations
//
// Two things override the in-page switch, both handled here and in CSS:
// the operating-system setting "reduce motion" always wins (the switch is
// locked off), because that is a request about the visitor's own comfort.

const STORAGE_KEY = 'mayns-world:ambient-motion';

export type MotionSetting = 'on' | 'off';

type MotionStorage = Pick<Storage, 'getItem' | 'setItem'>;
interface MotionMediaQuery {
  readonly matches: boolean;
  addEventListener(type: 'change', listener: () => void): void;
  removeEventListener(type: 'change', listener: () => void): void;
}
interface VisibilityDocument {
  readonly hidden: boolean;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}
interface VisibilityElement {
  toggleAttribute(name: string, force?: boolean): boolean;
}

function localStorageOrNull(): MotionStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function loadMotionSetting(storage: MotionStorage | null = localStorageOrNull()): MotionSetting {
  try {
    const saved = storage?.getItem(STORAGE_KEY);
    if (saved === 'on' || saved === 'off') return saved;
  } catch {
    // Storage unavailable: fall through to the default.
  }
  return 'on';
}

export function saveMotionSetting(
  setting: MotionSetting,
  storage: MotionStorage | null = localStorageOrNull(),
): void {
  try {
    storage?.setItem(STORAGE_KEY, setting);
  } catch {
    // Not saved, but the setting still applies for this visit.
  }
}

export function nextMotionSetting(setting: MotionSetting, locked: boolean): MotionSetting {
  return locked ? setting : setting === 'on' ? 'off' : 'on';
}

export function prefersReducedMotion(media?: Pick<MediaQueryList, 'matches'> | null): boolean {
  return media?.matches ?? false;
}

export function watchReducedMotion(
  media: MotionMediaQuery,
  onChange: (reduced: boolean) => void,
): () => void {
  const update = () => onChange(media.matches);
  media.addEventListener('change', update);
  return () => media.removeEventListener('change', update);
}

export function watchPageVisibility(page: VisibilityDocument, element: VisibilityElement): () => void {
  const update = () => {
    element.toggleAttribute('data-page-hidden', page.hidden);
  };
  update();
  page.addEventListener('visibilitychange', update);
  return () => page.removeEventListener('visibilitychange', update);
}

function deviceRequestsReducedMotion(): boolean {
  const media = typeof window === 'undefined'
    ? null
    : window.matchMedia?.('(prefers-reduced-motion: reduce)');
  return prefersReducedMotion(media);
}

export function useAmbientMotion() {
  const [setting, setSetting] = useState<MotionSetting>(loadMotionSetting);
  const [lockedByDevice, setLockedByDevice] = useState<boolean>(deviceRequestsReducedMotion);
  const motion: MotionSetting = lockedByDevice ? 'off' : setting;

  useEffect(() => {
    document.documentElement.dataset.motion = motion;
  }, [motion]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    return watchReducedMotion(media, setLockedByDevice);
  }, []);

  // Pause animations while the tab is in the background; nobody is watching.
  useEffect(() => {
    return watchPageVisibility(document, document.documentElement);
  }, []);

  const toggle = useCallback(() => {
    if (lockedByDevice) return;
    const next = nextMotionSetting(setting, lockedByDevice);
    setSetting(next);
    saveMotionSetting(next);
  }, [lockedByDevice, setting]);

  return { motion, toggle, lockedByDevice };
}
