import { describe, expect, it } from 'vitest';
import layoutJson from './layout.json';
import { readBuildings } from './buildings';
import { townBuildings, townTerrain } from './loader';

describe('townBuildings (the real layout.json)', () => {
  it('reads all 102 buildings with unique ids', () => {
    expect(townBuildings).toHaveLength(102);
    expect(new Set(townBuildings.map((b) => b.id)).size).toBe(102);
  });

  it('keeps every footprint inside the map and on one level', () => {
    for (const b of townBuildings) {
      const levels = new Set<number>();
      for (let y = b.y; y < b.y + b.d; y++) for (let x = b.x; x < b.x + b.w; x++) levels.add(townTerrain.levels[y]![x]!);
      expect(levels.size, `${b.name} (${b.id}) spans several levels`).toBe(1);
    }
  });

  it('keeps footprints on dry land', () => {
    for (const b of townBuildings) {
      for (let y = b.y; y < b.y + b.d; y++) for (let x = b.x; x < b.x + b.w; x++) {
        expect(townTerrain.water[y]![x], `${b.name} (${b.id}) at (${x}, ${y})`).toBe(false);
      }
    }
  });

  it('has exactly the six destination buildings', () => {
    const dest = Object.fromEntries(townBuildings.filter((b) => b.destination).map((b) => [b.destination, b.kind]));
    expect(dest).toEqual({
      about: 'cottage',
      projects: 'workshop',
      blog: 'library',
      resume: 'townhall',
      contact: 'postoffice',
      github: 'signallab',
    });
  });

  it('leaves the three shared doors exactly as the file has them (documented, unresolved)', () => {
    const doorOf = (id: number) => townBuildings.find((b) => b.id === id)!.door;
    expect(doorOf(54)).toEqual({ x: 4, y: 38 });
    expect(doorOf(89)).toEqual({ x: 4, y: 38 });
    expect(doorOf(70)).toEqual({ x: 53, y: 16 });
    expect(doorOf(71)).toEqual({ x: 53, y: 16 });
    expect(doorOf(79)).toEqual({ x: 37, y: 51 });
    expect(doorOf(92)).toEqual({ x: 37, y: 51 });
    expect((layoutJson.buildings as { id: number; door: number[] }[]).find((b) => b.id === 54)!.door).toEqual([4, 38]);
  });
});

describe('readBuildings validation', () => {
  const good = { id: 1, name: 'A', kind: 'cottage', tier: 'decor', x: 0, y: 0, w: 2, d: 2, door: [1, 2], destination: null };
  it('accepts a valid building', () => {
    expect(readBuildings([good], 10, 10)).toHaveLength(1);
  });
  it('rejects bad input and says why', () => {
    expect(() => readBuildings('x', 10, 10)).toThrow('list');
    expect(() => readBuildings([{ ...good, w: 0 }], 10, 10)).toThrow('w and d');
    expect(() => readBuildings([{ ...good, x: 9 }], 10, 10)).toThrow('outside');
    expect(() => readBuildings([{ ...good, tier: 'huge' }], 10, 10)).toThrow('tier');
    expect(() => readBuildings([{ ...good, door: [1] }], 10, 10)).toThrow('door');
    expect(() => readBuildings([{ ...good, destination: 99 }], 10, 10)).toThrow('destination');
    expect(() => readBuildings([good, good], 10, 10)).toThrow('twice');
  });
});
