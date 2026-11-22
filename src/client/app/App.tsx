import { useSyncExternalStore } from 'react';
import { TownCanvas } from '../world/TownCanvas';
import {
  getActiveTheme,
  subscribeActiveTheme,
} from '../world/activeTheme';
import { ThemeSelector } from '../components/ThemeSelector';
import { MotionToggle } from '../components/MotionToggle';
import { useAmbientMotion } from '../world/ambient/useAmbientMotion';

// The whole page is the world: one full-window canvas, nothing around it.
//
// There is deliberately no header, card grid or footer here. Destinations will
// become buildings in the world (a later milestone), reached through the same
// content modules (`content/destinations.ts`), which are untouched and simply not
// shown for now. The renderer does not import any of them.
//
// <h1> is visually hidden: the page still needs a title for screen readers and
// search engines, but the picture is the experience.
export function App() {
  const ambientMotion = useAmbientMotion();
  const theme = useSyncExternalStore(
    subscribeActiveTheme,
    getActiveTheme,
    getActiveTheme,
  );
  return (
    <main className="world-viewport">
      <h1 className="sr-only">Mayn&apos;s World</h1>
      <TownCanvas
        theme={theme}
        motion={ambientMotion.motion}
        reducedMotion={ambientMotion.lockedByDevice}
      />
      <ThemeSelector currentThemeId={theme.id} />
      <MotionToggle {...ambientMotion} />
    </main>
  );
}
