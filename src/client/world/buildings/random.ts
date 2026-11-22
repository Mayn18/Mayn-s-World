// Small deterministic helpers so a building always gets the same look.

// A repeatable value in [0, 1) from three integers.
export function hash2(a: number, b: number, c = 0): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function pick<T>(items: readonly T[], r: number): T {
  return items[Math.min(items.length - 1, Math.floor(r * items.length))] as T;
}

export type RampStep = -1 | 0 | 1;

export function seededRampStep(seed: number, index: number): RampStep {
  const r = hash2(seed, index, 173);
  return r < 0.34 ? -1 : r > 0.67 ? 1 : 0;
}

export function seededToggle(seed: number, index: number, chance: number): boolean {
  return hash2(seed, index, 211) < chance;
}
