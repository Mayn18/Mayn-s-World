// Deterministic randomness for procedural art.
//
// The town is drawn from code, so every "random" choice (which roof colour,
// where a grass speck falls) must come out the same on every visit and on every
// machine, otherwise the town would shimmer or differ between reloads, and tests
// could not pin anything. Nothing here uses Math.random.

// A fast integer hash of two coordinates and a seed -> a number in [0, 1).
export function hash2(x: number, y: number, seed = 0): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}

// A small seeded generator for code that needs a sequence of values.
export function rng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Picks one item by a hash value in [0, 1).
export function pick<T>(items: readonly T[], r: number): T {
  return items[Math.min(items.length - 1, Math.floor(r * items.length))]!;
}
