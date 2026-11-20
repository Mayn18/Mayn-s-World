// Chooses how each building looks: its recipe (an Appearance) from its kind, the
// district it stands in and its id.
//
// Variety comes from three sources so that no two neighbours look alike but the
// town still reads as one place:
//   kind      a cottage, a tavern and a warehouse have different shapes and details
//   district  each part of town has its own palette (cream and terracotta in the west
//             terraces, slate and timber at the wharf, red brick and thatch in the country)
//   id        a repeatable "random" choice within those, so a given building always
//             looks the same
import type { Building } from '../data/buildings';
import { hash2, pick } from './random';
import type { MaterialName } from '../themes';
import type { Appearance, Extra, Volume } from './style';

export type District = 'castle' | 'terraces' | 'plaza' | 'wharf' | 'country';

// Which part of town a building stands in. The data file names districts but does
// not give their outlines, so this is the renderer's reading of the labelled aerial
// view, by position.
export function districtOf(b: Building): District {
  if (b.tier === 'castle') return 'castle';
  if (b.x >= 56) return 'country';
  if (b.y >= 40 && b.x >= 30) return 'wharf';
  if (b.x < 30) return 'terraces';
  return 'plaza';
}

interface Palette {
  walls: MaterialName[];
  roofs: MaterialName[];
}

const PALETTES: Record<District, Palette> = {
  castle: { walls: ['wallStone'], roofs: ['roofSlate', 'roofBrown'] },
  terraces: {
    walls: ['wallCream', 'wallSand', 'wallPlaster', 'wallCream', 'wallWhite'],
    roofs: ['roofRed', 'roofBrown', 'roofOrange', 'roofRed', 'roofSlate'],
  },
  plaza: {
    walls: ['wallCream', 'wallSand', 'wallBrick', 'wallPlaster', 'wallBlue', 'wallWhite'],
    roofs: ['roofRed', 'roofOrange', 'roofSlate', 'roofBrown', 'roofGreen', 'roofBlue'],
  },
  wharf: {
    walls: ['wallTimber', 'wallBrick', 'wallSand', 'wallBlue', 'wallCream'],
    roofs: ['roofSlate', 'roofBrown', 'roofBlue', 'roofDark'],
  },
  country: {
    walls: ['wallSand', 'wallCream', 'wallBrick', 'wallTimber'],
    roofs: ['roofRed', 'roofBrown', 'roofThatch', 'roofOrange'],
  },
};

function volume(w: number, d: number, floors: number, extra: Partial<Volume> = {}): Volume {
  return { x0: 0, y0: 0, x1: w, y1: d, floors, roofShape: 'gable', ...extra };
}

function base(b: Building, wall: MaterialName, roof: MaterialName, volumes: Volume[], extra: Partial<Appearance> = {}): Appearance {
  return {
    volumes,
    wall,
    roof,
    plinth: false,
    timber: false,
    floorPx: 11,
    shutters: null,
    windowHeight: 0.52,
    windowSpacing: 0.85,
    door: 'plain',
    chimneys: 1,
    awning: null,
    extras: [],
    ...extra,
  };
}

// Houses of the ordinary kinds.
function house(b: Building, floors: number, r: (n: number) => number): Appearance {
  const pal = PALETTES[districtOf(b)];
  const wall = pick(pal.walls, r(1));
  let roof = pick(pal.roofs, r(2));
  const hip = b.w === b.d || r(3) < 0.35;
  const shutterChoice: (MaterialName | null)[] = [null, 'awnGreen', 'awnBlue', 'roofBrown', 'awnRed'];
  const lShaped = b.w >= 3 && b.d >= 3 && r(4) < 0.45 && floors >= 2;
  let volumes: Volume[];
  if (lShaped) {
    // A main block at the back and a cross-gabled wing at the front.
    const split = Math.max(1, Math.round(b.d * 0.55));
    const wing = Math.max(1, Math.round(b.w * 0.5));
    volumes = [
      volume(b.w, split, floors, { roofShape: 'gable', ridge: 'x' }),
      { x0: 0, y0: split - 0.2, x1: wing, y1: b.d, floors, roofShape: 'gable', ridge: 'y' },
    ];
  } else {
    volumes = [volume(b.w, b.d, floors, { roofShape: hip ? 'hip' : 'gable' })];
  }
  if (wall === 'wallTimber' && roof === 'roofBrown') roof = 'roofSlate';
  return base(b, wall, roof, volumes, {
    timber: r(5) < 0.3 && wall !== 'wallBrick' && wall !== 'wallTimber',
    shutters: pick(shutterChoice, r(6)),
    door: r(7) < 0.3 ? 'arched' : 'plain',
    chimneys: b.w * b.d >= 9 ? 2 : 1,
    plinth: r(8) < 0.4,
    windowSpacing: 0.8 + r(9) * 0.15,
    extras: r(10) < 0.4 ? [{ type: 'flowerBoxes' }] : [],
  });
}

export function appearanceFor(b: Building): Appearance {
  const r = (n: number) => hash2(b.id, n, 91);
  const district = districtOf(b);
  const area = b.w * b.d;

  switch (b.kind) {
    // ---- the six destinations -------------------------------------------------
    case 'townhall': {
      // A broad hall with a clock tower in front of it.
      const main = volume(b.w, b.d - 1.2, 2, { roofShape: 'hip', pitch: 0.5, roof: 'roofRed' });
      const tower: Volume = { x0: 2.0, y0: b.d - 2.6, x1: 4.2, y1: b.d, floors: 4, roofShape: 'hip', pitch: 1.0, roof: 'roofTeal', floorPx: 12 };
      return base(b, 'wallCream', 'roofRed', [main, tower], {
        plinth: true,
        door: 'arched',
        shutters: 'awnBlue',
        windowHeight: 0.62,
        chimneys: 1,
        extras: [{ type: 'clock', volume: 1 }, { type: 'steps' }],
      });
    }
    case 'library': {
      return base(b, 'wallCream', 'roofGreen', [volume(b.w, b.d, 2, { roofShape: 'gable', ridge: 'x', pitch: 0.5 })], {
        plinth: true,
        door: 'arched',
        windowHeight: 0.66,
        windowSpacing: 0.7,
        shutters: null,
        chimneys: 1,
        extras: [{ type: 'dome' }, { type: 'steps' }, { type: 'sign', colour: 'awnBlue' }],
      });
    }
    case 'postoffice': {
      return base(b, 'wallBrick', 'roofSlate', [volume(b.w, b.d, 2, { roofShape: 'hip', pitch: 0.55 })], {
        plinth: true,
        door: 'double',
        awning: 'awnBlue',
        windowSpacing: 0.75,
        chimneys: 1,
        extras: [{ type: 'flag' }, { type: 'sign', colour: 'awnRed' }],
      });
    }
    case 'workshop': {
      return base(b, 'wallBlue', 'roofOrange', [volume(b.w, b.d, 2, { roofShape: 'hip', pitch: 0.5 })], {
        timber: true,
        door: 'wide',
        shutters: 'awnGreen',
        chimneys: 2,
        extras: [{ type: 'sign', colour: 'roofBrown' }],
      });
    }
    case 'signallab': {
      const tower: Volume = { x0: b.w - 2.2, y0: b.d - 2.4, x1: b.w - 0.2, y1: b.d - 0.4, floors: 4, roofShape: 'hip', pitch: 0.7, roof: 'roofTeal', floorPx: 12 };
      const main = volume(b.w, b.d, 2, { roofShape: 'flat', roof: 'roofSlate' });
      return base(b, 'wallPlaster', 'roofSlate', [main, tower], {
        plinth: true,
        door: 'plain',
        awning: 'awnGreen',
        windowHeight: 0.6,
        windowSpacing: 0.7,
        chimneys: 0,
        shutters: 'awnGreen',
        extras: [{ type: 'solar' }, { type: 'mast' }],
      });
    }
    case 'cottage':
      if (b.destination === 'about') {
        return base(b, 'wallSand', 'roofBrown', [volume(b.w, b.d, 2, { roofShape: 'gable', ridge: 'y', pitch: 0.62 })], {
          timber: true,
          plinth: true,
          door: 'arched',
          shutters: 'awnGreen',
          chimneys: 1,
          windowHeight: 0.56,
          extras: [{ type: 'flowerBoxes' }, { type: 'steps' }],
        });
      }
      return house(b, area <= 6 && r(11) < 0.6 ? 1 : 2, r);

    // ---- castle buildings that are houses of stone -------------------------------
    case 'greathall':
      return base(b, 'wallStone', 'roofSlate', [volume(b.w, b.d, 2, { roofShape: 'gable', ridge: 'x', pitch: 0.5, floorPx: 17 })], {
        plinth: true,
        door: 'arched',
        windowHeight: 0.72,
        windowSpacing: 0.9,
        chimneys: 2,
        extras: [{ type: 'steps' }],
      });
    case 'stables':
      return base(b, 'wallTimber', 'roofBrown', [volume(b.w, b.d, 1, { roofShape: 'gable', floorPx: 14 })], {
        door: 'wide',
        plinth: true,
        windowHeight: 0.4,
        chimneys: 0,
      });
    case 'lodge':
      return base(b, 'wallStone', 'roofBrown', [volume(b.w, b.d, 1, { roofShape: 'gable', floorPx: 14 })], { plinth: true, chimneys: 1 });

    case 'barracks':
      return base(b, 'wallStone', 'roofSlate', [volume(b.w, b.d, 2, { roofShape: 'gable', ridge: b.w >= b.d ? 'x' : 'y', pitch: 0.46, floorPx: 15 })], {
        plinth: true, door: 'plain', windowHeight: 0.5, windowSpacing: 1.1, chimneys: 2, extras: [{ type: 'steps' }],
      });
    case 'storehouse':
      return base(b, 'wallStone', 'roofBrown', [volume(b.w, b.d, 1, { roofShape: 'gable', ridge: 'x', pitch: 0.5, floorPx: 17 })], {
        plinth: true, door: 'wide', windowHeight: 0.3, windowSpacing: 1.6, chimneys: 0, extras: [{ type: 'barnDoor' }],
      });

    // ---- countryside and specialised buildings -------------------------------------
    case 'barn':
      return base(b, 'wallBrick', 'roofDark', [volume(b.w, b.d, 1, { roofShape: 'gable', ridge: b.w >= b.d ? 'x' : 'y', floorPx: 17, pitch: 0.5 })], {
        door: 'wide', plinth: true, windowHeight: 0.3, windowSpacing: 1.3, chimneys: 0, extras: [{ type: 'barnDoor' }],
      });
    case 'farm': {
      const main = volume(b.w, Math.max(2, b.d - 1), 2, { roofShape: 'gable', ridge: 'x' });
      const wing: Volume = { x0: 0, y0: Math.max(1, b.d - 1.8), x1: Math.max(1.6, b.w * 0.5), y1: b.d, floors: 1, roofShape: 'gable', ridge: 'y', floorPx: 12 };
      return base(b, pick(['wallCream', 'wallSand'] as MaterialName[], r(1)), pick(['roofBrown', 'roofRed'] as MaterialName[], r(2)), b.d >= 3 ? [main, wing] : [volume(b.w, b.d, 2)], {
        timber: true, plinth: true, shutters: 'awnGreen', chimneys: 2, door: 'arched', extras: [{ type: 'flowerBoxes' }],
      });
    }
    case 'granary':
      return base(b, 'wallStone', 'roofSlate', [volume(b.w, b.d, 3, { roofShape: 'hip', pitch: 0.85, floorPx: 12 })], {
        plinth: true, door: 'wide', windowHeight: 0.28, windowSpacing: 1.1, chimneys: 0,
      });
    case 'boathouse':
      return base(b, 'wallTimber', 'roofBlue', [volume(b.w, b.d, 1, { roofShape: 'gable', ridge: 'x', floorPx: 16, pitch: 0.5 })], {
        door: 'wide', plinth: true, windowHeight: 0.35, chimneys: 1, extras: [{ type: 'sign', colour: 'awnBlue' }],
      });
    case 'chapel': {
      const nave = volume(b.w, b.d, 2, { roofShape: 'gable', ridge: 'x', pitch: 0.6 });
      const tower: Volume = { x0: b.w - 1.5, y0: b.d - 1.5, x1: b.w - 0.05, y1: b.d - 0.05, floors: 4, roofShape: 'hip', pitch: 2.1, roof: 'roofSlate', floorPx: 11 };
      return base(b, 'wallCream', 'roofSlate', [nave, tower], { plinth: true, door: 'arched', windowHeight: 0.7, windowSpacing: 0.95, chimneys: 0, extras: [{ type: 'steps' }] });
    }
    case 'observatory':
      return base(b, 'wallWhite', 'roofSlate', [volume(b.w, b.d, 3, { roofShape: 'flat', roof: 'roofSlate', floorPx: 11 })], {
        plinth: true, door: 'arched', windowHeight: 0.6, windowSpacing: 0.8, chimneys: 0, extras: [{ type: 'dome' }, { type: 'steps' }],
      });
    case 'mill':
      return base(b, 'wallCream', 'roofBrown', [volume(b.w, b.d, 2, { roofShape: 'gable', ridge: 'y', pitch: 0.55 })], {
        timber: true, plinth: true, door: 'plain', shutters: 'awnBlue', chimneys: 1, extras: [{ type: 'wheel' }],
      });
    case 'market':
      return base(b, 'wallTimber', 'roofBlue', [volume(b.w, b.d, 1, { roofShape: 'gable', ridge: 'x', floorPx: 16, pitch: 0.5 })], {
        door: 'wide', awning: 'awnBlue', windowHeight: 0.35, windowSpacing: 1.1, chimneys: 0, extras: [{ type: 'sign', colour: 'awnYellow' }],
      });

    // ---- commercial ----------------------------------------------------------
    case 'cafe':
      return base(b, pick(['wallCream', 'wallSand', 'wallWhite'] as MaterialName[], r(1)), pick(['roofRed', 'roofOrange', 'roofGreen'] as MaterialName[], r(2)), [volume(b.w, b.d, 2, { roofShape: 'hip' })], {
        awning: pick(['awnRed', 'awnGreen', 'awnYellow'] as MaterialName[], r(3)),
        door: 'double',
        plinth: true,
        extras: [{ type: 'flowerBoxes' }, { type: 'sign', colour: 'awnYellow' }],
      });
    case 'inn':
      return base(b, 'wallCream', 'roofSlate', [volume(b.w, b.d, 3, { roofShape: 'gable', pitch: 0.5 })], {
        timber: true,
        awning: 'awnGreen',
        door: 'double',
        plinth: true,
        shutters: 'awnGreen',
        chimneys: 2,
        extras: [{ type: 'sign', colour: 'awnRed' }],
      });
    case 'tavern':
      return base(b, 'wallSand', district === 'wharf' ? 'roofBlue' : 'roofSlate', [volume(b.w, b.d, 2, { roofShape: 'hip' })], {
        timber: true,
        door: 'double',
        plinth: true,
        chimneys: 1,
        extras: [{ type: 'sign', colour: 'awnRed' }],
      });
    case 'store':
      return base(b, 'wallBrick', 'roofBrown', [volume(b.w, b.d, 2, { roofShape: 'gable' })], {
        awning: 'awnBlue',
        door: 'double',
        plinth: true,
        extras: [{ type: 'sign', colour: 'awnBlue' }],
      });
    case 'bakery':
      return base(b, 'wallCream', 'roofOrange', [volume(b.w, b.d, 2, { roofShape: 'hip' })], {
        awning: 'awnYellow',
        door: 'double',
        chimneys: 2,
        extras: [{ type: 'flowerBoxes' }],
      });
    case 'smith':
      return base(b, 'wallStone', 'roofDark', [volume(b.w, b.d, 1, { roofShape: 'gable', floorPx: 14 })], {
        door: 'wide',
        plinth: true,
        windowHeight: 0.4,
        chimneys: 2,
      });
    case 'warehouse':
      return base(b, district === 'wharf' ? 'wallTimber' : 'wallSand', 'roofBrown', [volume(b.w, b.d, 2, { roofShape: 'gable', pitch: 0.4, floorPx: 12 })], {
        door: 'wide',
        plinth: true,
        windowHeight: 0.34,
        windowSpacing: 1.1,
        chimneys: 0,
      });
    case 'clinic':
      return base(b, 'wallWhite', 'roofGreen', [volume(b.w, b.d, 2, { roofShape: 'hip' })], {
        plinth: true,
        door: 'double',
        windowSpacing: 0.7,
        shutters: 'awnGreen',
        extras: [{ type: 'sign', colour: 'awnRed' }],
      });
    case 'school':
      return base(b, 'wallBrick', 'roofSlate', [volume(b.w, b.d, 2, { roofShape: 'hip' })], {
        plinth: true,
        door: 'double',
        windowHeight: 0.6,
        windowSpacing: 0.7,
      });

    // ---- ordinary housing ----------------------------------------------------
    case 'large':
    case 'multi':
      return house(b, 3, r);
    case 'family':
      return house(b, 2, r);
    case 'row':
      return base(b, pick(PALETTES[district].walls, r(1)), pick(PALETTES[district].roofs, r(2)), [volume(b.w, b.d, 2, { roofShape: 'gable' })], {
        shutters: pick<MaterialName | null>([null, 'awnGreen', 'awnBlue'], r(6)),
        chimneys: 2,
        windowSpacing: 0.62,
        plinth: true,
      });
    default:
      return house(b, area <= 6 ? 1 : 2, r);
  }
}

// Exposed so tests can see how many kinds are specially designed.
export const DESIGNED_KINDS = [
  'townhall', 'library', 'postoffice', 'workshop', 'signallab', 'cottage', 'cafe', 'inn', 'tavern', 'store',
  'bakery', 'smith', 'warehouse', 'clinic', 'school', 'large', 'multi', 'family', 'row',
  'barn', 'farm', 'granary', 'boathouse', 'chapel', 'observatory', 'mill', 'market', 'greathall', 'stables', 'lodge', 'barracks', 'storehouse',
] as const;

export type { Extra };
