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

function deviceRequestsReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

// localStorage can throw (private browsing, blocked site data) or come back
// empty, so every access is wrapped and the page works without it.
function loadSetting(): MotionSetting {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'on' || saved === 'off') return saved;
  } catch {
    // Storage unavailable: fall through to the default.
  }
  return 'on';
}

function saveSetting(setting: MotionSetting): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, setting);
  } catch {
    // Not saved, but the setting still applies for this visit.
  }
}

export function useAmbientMotion() {
  const [setting, setSetting] = useState<MotionSetting>(loadSetting);
  const [lockedByDevice, setLockedByDevice] = useState<boolean>(deviceRequestsReducedMotion);
  const motion: MotionSetting = lockedByDevice ? 'off' : setting;

  useEffect(() => {
    document.documentElement.dataset.motion = motion;
  }, [motion]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    const update = () => setLockedByDevice(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  // Pause animations while the tab is in the background; nobody is watching.
  useEffect(() => {
    const update = () => {
      document.documentElement.toggleAttribute('data-page-hidden', document.hidden);
    };
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  const toggle = useCallback(() => {
    if (lockedByDevice) return;
    const next: MotionSetting = setting === 'on' ? 'off' : 'on';
    setSetting(next);
    saveSetting(next);
  }, [lockedByDevice, setting]);

  return { motion, toggle, lockedByDevice };
}
