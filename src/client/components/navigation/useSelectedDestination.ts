import { useSyncExternalStore } from 'react';
import { parseHash, type DestinationId } from '../../content/destinations';

// The URL hash is state that lives outside React: the browser changes it when
// a visitor clicks a "#about" link, presses back, or edits the address bar.
// useSyncExternalStore is React's tool for reading that kind of state safely.
// It takes a way to subscribe to changes and a way to read the current value,
// and re-renders the component whenever the value differs.
//
// Using the hash means a link such as https://example.com/#projects works,
// back and forward work, and no routing library is needed until real pages
// exist (Phase 5).

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

// The value is a string or null, so React can compare snapshots with ===.
// (Returning a new object each time would cause an endless re-render loop.)
function getSnapshot(): DestinationId | null {
  return parseHash(window.location.hash);
}

export function useSelectedDestination(): DestinationId | null {
  return useSyncExternalStore(subscribe, getSnapshot);
}
