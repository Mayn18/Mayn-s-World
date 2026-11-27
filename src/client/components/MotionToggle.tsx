import { home } from '../content/home';
import type { MotionSetting } from '../world/ambient/useAmbientMotion';

interface MotionToggleProps {
  motion: MotionSetting;
  toggle: () => void;
  lockedByDevice: boolean;
}

// The switch for ambient animation. aria-pressed makes it a toggle button for
// assistive technology ("Ambient motion, toggle button, pressed"). The visible
// text also says On or Off, so the state is never carried by colour alone.
export function MotionToggle({ motion, toggle, lockedByDevice }: MotionToggleProps) {
  return (
    <div className="world-motion-control">
      <button
        type="button"
        className="pixel-button pixel-button-quiet"
        aria-pressed={motion === 'on'}
        disabled={lockedByDevice}
        onClick={toggle}
      >
        Ambient motion: {motion === 'on' ? 'On' : 'Off'}
      </button>
      {lockedByDevice && <span className="text-sm text-ink-muted">{home.motionLockedNote}</span>}
    </div>
  );
}
