import type { CSSProperties, ReactNode } from 'react';
import { destinationHref, type Destination } from '../../content/destinations';

interface DestinationLinkProps {
  destination: Destination;
  className?: string;
  style?: CSSProperties;
  // True when this destination's panel is open, for assistive technology.
  current?: boolean;
  children: ReactNode;
}

// The one place that decides how a link to a destination behaves, so the
// scene and the destination index can never disagree.
//
// - Destinations on this site are links to a "#hash" (see
//   useSelectedDestination), which a keyboard, mouse or touch can all activate.
// - External destinations open in a new tab. rel="noopener noreferrer" stops
//   the new page from getting a handle on this one. The visually hidden text
//   tells screen-reader users it opens a new tab, since a sighted user can
//   usually tell but a screen reader cannot.
export function DestinationLink({
  destination,
  className,
  style,
  current,
  children,
}: DestinationLinkProps) {
  const external = destination.externalUrl !== undefined;
  return (
    <a
      href={destinationHref(destination)}
      className={className}
      style={style}
      aria-current={current ? 'true' : undefined}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
      {external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}
