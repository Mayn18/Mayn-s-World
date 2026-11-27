import { destinations, type DestinationId } from '../../content/destinations';
import { home } from '../../content/home';
import { PixelPanel } from '../pixel-ui/PixelPanel';
import { DestinationLink } from './DestinationLink';

interface DestinationIndexProps {
  selected: DestinationId | null;
}

// The plain-list way to reach every destination. Exploring the meadow is the
// main way to move around, but it must never be the ONLY way: this list works
// for keyboard and screen-reader users, for small touch screens, and for
// anyone who just wants to get somewhere quickly.
//
// It is a <nav> with a label, so assistive technology can list it as a
// landmark ("Destinations, navigation") and jump straight to it. A list inside
// tells a screen reader "list of 6 items".
export function DestinationIndex({ selected }: DestinationIndexProps) {
  return (
    <PixelPanel as="nav" aria-labelledby="destination-index-heading" className="p-5 sm:p-6">
      <h2 id="destination-index-heading" className="font-pixel text-2xl">
        {home.indexHeading}
      </h2>
      <p className="mt-1 text-ink-muted">{home.indexHint}</p>

      <ul className="mt-5 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {destinations.map((destination) => (
          <li key={destination.id}>
            <DestinationLink
              destination={destination}
              className="pixel-card"
              current={selected === destination.id}
            >
              <span className="font-pixel text-xl">{destination.label}</span>
              <span className="text-sm">{destination.summary}</span>
            </DestinationLink>
          </li>
        ))}
      </ul>
    </PixelPanel>
  );
}
