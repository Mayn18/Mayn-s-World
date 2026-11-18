import { describe, expect, it } from 'vitest';
import { makeTerrain } from './fixtures';
import { SKIRT_LEVELS, WATER_DROP_LEVELS, buildTerrainModel } from './model';
import { townModel } from './town';

describe('buildTerrainModel', () => {
  const model = buildTerrainModel(
    makeTerrain(
      [
        [2, 1],
        [0, 0],
      ],
      {
        water: [
          [false, false],
          [false, true],
        ],
      },
    ),
  );

  it('sets the surface to the level, lowered by 0.4 for water', () => {
    expect(model.surface).toEqual([
      [2, 1],
      [0, 0 - WATER_DROP_LEVELS],
    ]);
  });

  it('gives a face to the south or east side of the higher tile only', () => {
    // (0,0) is level 2 with lower tiles to its east and south.
    expect(model.faces[0]![0]!.east).toMatchObject({ top: 2, bottom: 1 });
    expect(model.faces[0]![0]!.south).toMatchObject({ top: 2, bottom: 0 });
    // Lower tiles hide their north/west sides: no faces for steps leading up.
    expect(model.faces[1]![0]!.south).toMatchObject({ kind: 'skirt' }); // map edge only
  });

  it('cuts the map edge as a skirt reaching below level 0', () => {
    expect(model.faces[1]![0]!.south).toEqual({ kind: 'skirt', top: 0, bottom: -SKIRT_LEVELS });
    expect(model.faces[0]![1]!.east).toEqual({ kind: 'skirt', top: 1, bottom: -SKIRT_LEVELS });
  });

  it('cuts the map edge as deep water where the river reaches it', () => {
    expect(model.faces[1]![1]!.south!.kind).toBe('waterSkirt');
    expect(model.faces[1]![1]!.east!.kind).toBe('waterSkirt');
  });
});

describe('the town model', () => {
  it('covers 80 x 60 tiles in every table', () => {
    expect(townModel.surface).toHaveLength(60);
    expect(townModel.faces).toHaveLength(60);
    expect(townModel.shore.every((row) => row.length === 80)).toBe(true);
    expect(townModel.order).toHaveLength(4800);
  });

  it('draws every map-edge tile with a skirt on its south / east side', () => {
    for (let x = 0; x < 80; x++) expect(townModel.faces[59]![x]!.south).not.toBeNull();
    for (let y = 0; y < 60; y++) expect(townModel.faces[y]![79]!.east).not.toBeNull();
  });
});
