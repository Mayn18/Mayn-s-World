// The town's road layer, built once from the town terrain when first imported.
// Kept apart from roadLayer.ts for the same reason as terrain/town.ts: so the
// functions can be given any terrain, and tests do not drag the real map in.
import { townModel } from '../terrain/town';
import { buildRoadLayer } from './roadLayer';

export const townRoadLayer = buildRoadLayer(townModel);
