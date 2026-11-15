import { home } from '../content/home';
import { useAmbientMotion } from '../world/ambient/useAmbientMotion';

// The switch for ambient animation. aria-pressed makes it a toggle button for
// assistive technology ("Ambient motion, toggle button, pressed"). The visible
// text also says On or Off, so the state is never carried by colour alone.
export function MotionToggle() {
  const { motion, toggle, lockedByDevice } = useAmbientMotion();

  return (
    <div className="flex flex-wrap items-center gap-4">
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
