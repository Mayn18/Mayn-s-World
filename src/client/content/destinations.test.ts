import { describe, expect, it } from 'vitest';
import {
  DESTINATION_IDS,
  destinationHref,
  destinations,
  getDestination,
  parseHash,
} from './destinations';

describe('destinations', () => {
  it('has exactly one entry for each destination id, in order', () => {
    expect(destinations.map((d) => d.id)).toEqual([...DESTINATION_IDS]);
  });

  it('covers the six destinations the requirements name', () => {
    expect([...DESTINATION_IDS].sort()).toEqual(
      ['about', 'blog', 'contact', 'github', 'projects', 'resume'].sort(),
    );
  });

  it('gives every destination a label, summary and scene object', () => {
    for (const destination of destinations) {
      expect(destination.label.trim()).not.toBe('');
      expect(destination.summary.trim()).not.toBe('');
      expect(destination.sceneObject.trim()).not.toBe('');
    }
  });

  it('only sends visitors to https addresses off this site', () => {
    for (const destination of destinations) {
      if (destination.externalUrl) {
        expect(destination.externalUrl).toMatch(/^https:\/\//);
      }
    }
  });

  it('finds a destination by id', () => {
    expect(getDestination('projects').label).toBe('Projects');
  });
});

describe('destinationHref', () => {
  it('links in-site destinations to a hash and external ones to their address', () => {
    expect(destinationHref(getDestination('about'))).toBe('#about');
    expect(destinationHref(getDestination('github'))).toBe('https://github.com/Mayn18');
  });
});

describe('parseHash', () => {
  it('reads a destination from the URL hash', () => {
    expect(parseHash('#about')).toBe('about');
    expect(parseHash('#contact')).toBe('contact');
    expect(parseHash('resume')).toBe('resume');
  });

  it('means "nothing open" for anything else', () => {
    expect(parseHash('')).toBeNull();
    expect(parseHash('#')).toBeNull();
    expect(parseHash('#meadow')).toBeNull();
    expect(parseHash('#About')).toBeNull(); // ids are lower case
    expect(parseHash('#about/extra')).toBeNull();
    expect(parseHash('#constructor')).toBeNull(); // not a property lookup
    expect(parseHash('#<script>alert(1)</script>')).toBeNull();
  });
});
