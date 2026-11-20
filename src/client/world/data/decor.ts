// Reads the environment parts of layout.json: props, garden yards, fences, crop fields,
// willows and reeds. Like buildings.ts, it only checks and types the data; how things
// look is decided in decor/.

export interface Prop {
  t: string; // lamp, bench, sheep, boat, haystack, hive, well, crate, net, scarecrow
  x: number;
  y: number;
}

// A garden bed beside a building. `side` is which side of building `of` it lies on.
export interface Yard {
  x: number;
  y: number;
  w: number;
  d: number;
  side: 'N' | 'S' | 'E' | 'W';
  of: number;
}

// A fenced rectangle: x, y, width, depth in tiles.
export type FenceRect = readonly [number, number, number, number];

// What a field tile grows. 0 is none. The file does not name the numbers; they were
// matched to the Stage 2 v2 aerial view (see docs/visual-design.md).
export type FieldType = 0 | 1 | 2 | 3 | 4;
export const FIELD_WHEAT = 1;
export const FIELD_CROPS = 2;
export const FIELD_STRAW = 3;
export const FIELD_PASTURE = 4;

export interface DecorData {
  props: Prop[];
  yards: Yard[];
  fences: FenceRect[];
  fields: readonly (readonly FieldType[])[];
  willows: [number, number][];
  reeds: [number, number][];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
const whole = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);

function readPairs(raw: unknown, what: string): [number, number][] {
  if (!Array.isArray(raw)) throw new Error(`layout.json: ${what} must be a list`);
  return raw.map((p, i) => {
    if (!Array.isArray(p) || !whole(p[0]) || !whole(p[1])) throw new Error(`layout.json: ${what}[${i}] must be [x, y]`);
    return [p[0], p[1]];
  });
}

export function readDecor(layout: unknown, width: number, height: number): DecorData {
  if (!isRecord(layout)) throw new Error('layout.json must be an object');
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height;

  const rawProps = layout.props;
  if (!Array.isArray(rawProps)) throw new Error('layout.json: "props" must be a list');
  const props = rawProps.map((p: unknown, i): Prop => {
    if (!isRecord(p) || typeof p.t !== 'string' || !whole(p.x) || !whole(p.y) || !inside(p.x, p.y)) {
      throw new Error(`layout.json: props[${i}] needs a text "t" and whole x, y inside the map`);
    }
    return { t: p.t, x: p.x, y: p.y };
  });

  const rawYards = layout.yards;
  if (!Array.isArray(rawYards)) throw new Error('layout.json: "yards" must be a list');
  const yards = rawYards.map((y: unknown, i): Yard => {
    if (!isRecord(y) || !whole(y.x) || !whole(y.y) || !whole(y.w) || !whole(y.d) || !whole(y.of)) {
      throw new Error(`layout.json: yards[${i}] needs whole x, y, w, d and "of"`);
    }
    if (y.side !== 'N' && y.side !== 'S' && y.side !== 'E' && y.side !== 'W') {
      throw new Error(`layout.json: yards[${i}] has an unknown side`);
    }
    return { x: y.x, y: y.y, w: y.w, d: y.d, side: y.side, of: y.of };
  });

  const rawFences = layout.fences;
  if (!Array.isArray(rawFences)) throw new Error('layout.json: "fences" must be a list');
  const fences = rawFences.map((f: unknown, i): FenceRect => {
    if (!Array.isArray(f) || f.length !== 4 || !f.every(whole)) throw new Error(`layout.json: fences[${i}] must be [x, y, w, d]`);
    return [f[0], f[1], f[2], f[3]] as FenceRect;
  });

  const rawFields = layout.field_types;
  if (!Array.isArray(rawFields) || rawFields.length !== height) throw new Error(`layout.json: "field_types" must have ${height} rows`);
  const fields = rawFields.map((row: unknown, y) => {
    if (typeof row !== 'string' || row.length !== width) throw new Error(`layout.json: field_types[${y}] must be ${width} characters`);
    return Array.from(row, (ch) => {
      const n = Number(ch);
      if (!Number.isInteger(n) || n < 0 || n > 4) throw new Error(`layout.json: field_types[${y}] has an unknown crop "${ch}"`);
      return n as FieldType;
    });
  });

  const veg = layout.vegetation;
  if (!isRecord(veg)) throw new Error('layout.json: "vegetation" must be an object');
  return {
    props,
    yards,
    fences,
    fields,
    willows: readPairs(veg.willows, 'vegetation.willows'),
    reeds: readPairs(veg.reeds, 'vegetation.reeds'),
  };
}
