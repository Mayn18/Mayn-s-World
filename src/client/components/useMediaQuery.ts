import { useSyncExternalStore } from 'react';

// True while the browser window matches a CSS media query, for example
// '(min-width: 720px)'. It updates when the window is resized or rotated.
//
// This exists because CSS alone cannot do one thing the meadow needs: on a
// narrow screen the scene's links must leave the page entirely (so keyboard
// and screen-reader users do not meet every destination twice) while their
// artwork stays. display:none would hide the artwork too, so React decides
// what to render instead.
//
// Like useSelectedDestination, this reads state that lives outside React, so it
// uses useSyncExternalStore.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
  );
}
