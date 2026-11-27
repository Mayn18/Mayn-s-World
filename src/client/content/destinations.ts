// The places a visitor can go. This is content, not presentation: the scene,
// the destination index and the detail panel all read this one list, so a name
// or description is changed in exactly one place.
//
// The descriptions are generic placeholders. They say what each part of the
// site is for, not anything about the owner; real copy arrives with the
// content phase.

export const DESTINATION_IDS = [
  'about',
  'projects',
  'blog',
  'resume',
  'contact',
  'github',
] as const;

export type DestinationId = (typeof DESTINATION_IDS)[number];

export interface Destination {
  id: DestinationId;
  label: string;
  // One line shown in the destination index.
  summary: string;
  // Where the object in the meadow is, so the scene and index agree on names.
  sceneObject: string;
  // Set for destinations that leave this site. Others open the in-page panel
  // for now and become real pages in Phase 5.
  externalUrl?: string;
}

export const destinations: readonly Destination[] = [
  {
    id: 'about',
    label: 'About',
    summary: 'Who lives in this world.',
    sceneObject: 'the cabin',
  },
  {
    id: 'projects',
    label: 'Projects',
    summary: 'Things built here.',
    sceneObject: 'the notice board',
  },
  {
    id: 'blog',
    label: 'Blog',
    summary: 'Notes and write-ups.',
    sceneObject: 'the signpost',
  },
  {
    id: 'resume',
    label: 'Resume',
    summary: 'Background and experience.',
    sceneObject: 'the signpost',
  },
  {
    id: 'contact',
    label: 'Contact',
    summary: 'Say hello.',
    sceneObject: 'the mailbox',
  },
  {
    id: 'github',
    label: 'GitHub',
    summary: 'Code and repositories.',
    sceneObject: 'the signpost',
    // The owner's public profile (the same account that hosts this repository).
    externalUrl: 'https://github.com/Mayn18',
  },
];

export function getDestination(id: DestinationId): Destination {
  const found = destinations.find((destination) => destination.id === id);
  if (!found) {
    // Unreachable while DestinationId and the list agree; the test checks that.
    throw new Error(`Unknown destination: ${id}`);
  }
  return found;
}

// The href to use for a destination's link: the external site, or an in-page
// hash that opens the panel.
export function destinationHref(destination: Destination): string {
  return destination.externalUrl ?? `#${destination.id}`;
}

// "#about" -> "about". Anything else, including no hash, an unknown word or
// "#meadow" (the anchor the panel's close link points at), means "no
// destination is open". Visitors can type anything into the address bar, so the
// value is checked against the list rather than trusted.
export function parseHash(hash: string): DestinationId | null {
  const value = hash.startsWith('#') ? hash.slice(1) : hash;
  return (DESTINATION_IDS as readonly string[]).includes(value)
    ? (value as DestinationId)
    : null;
}
