import { useEffect, useRef } from 'react';
import { getDestination, type DestinationId } from '../../content/destinations';
import { home } from '../../content/home';
import { PixelPanel } from '../pixel-ui/PixelPanel';
import { DestinationLink } from './DestinationLink';

interface DestinationPanelProps {
  id: DestinationId;
}

// The placeholder that opens when a destination is chosen. Real pages arrive
// in a later phase; until then this proves the navigation works end to end
// without pretending the pages exist.
//
// Focus: when the panel appears, keyboard focus moves to its heading. Without
// that, a keyboard or screen-reader user would activate a link and nothing
// would seem to happen, because the new content is somewhere else on the page.
// tabIndex={-1} lets a script focus the heading without adding it to the Tab
// order. App gives this component key={id}, so choosing another destination
// remounts it and this effect runs again.
export function DestinationPanel({ id }: DestinationPanelProps) {
  const destination = getDestination(id);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <PixelPanel
      as="section"
      id="destination-panel"
      aria-labelledby="destination-panel-heading"
      className="p-5 sm:p-6"
    >
      <h2
        id="destination-panel-heading"
        ref={headingRef}
        tabIndex={-1}
        className="font-pixel text-3xl"
      >
        {destination.label}
      </h2>
      <p className="mt-2 text-ink-muted">{destination.summary}</p>
      <p className="mt-4">
        {destination.externalUrl ? home.panelExternal : home.panelPlaceholder}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-6">
        {destination.externalUrl && (
          <DestinationLink destination={destination} className="pixel-button">
            Open {destination.label}
          </DestinationLink>
        )}
        {/* #meadow is the id of the scene; parseHash treats it as "nothing
            open", so following this link closes the panel and scrolls back to
            the picture, with no script. */}
        <a href="#meadow" className="pixel-button pixel-button-quiet">
          Back to the meadow
        </a>
      </div>
    </PixelPanel>
  );
}
