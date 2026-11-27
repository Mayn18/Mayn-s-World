// The town's terrain model, built once from layout.json when first imported.
// Kept in its own file so everything else (model.ts, the painter, the tests) can
// be given any terrain and does not drag the real map in with it.
import { townTerrain } from '../data/loader';
import { buildTerrainModel } from './model';

export const townModel = buildTerrainModel(townTerrain);
