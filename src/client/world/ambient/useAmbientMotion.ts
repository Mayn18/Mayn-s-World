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
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// localStorage can throw (private browsing, blocked site data) or come back
// empty, so every access is wrapped and the page works without it.
function loadSetting(): MotionSetting {
  if (deviceRequestsReducedMotion()) return 'off';
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
  // Passing the function (not its result) means it runs once, on first render.
  const [motion, setMotion] = useState<MotionSetting>(loadSetting);
  const [lockedByDevice] = useState<boolean>(deviceRequestsReducedMotion);

  useEffect(() => {
    document.documentElement.dataset.motion = motion;
  }, [motion]);

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
    const next: MotionSetting = motion === 'on' ? 'off' : 'on';
    setMotion(next);
    saveSetting(next);
  }, [lockedByDevice, motion]);

  return { motion, toggle, lockedByDevice };
}
