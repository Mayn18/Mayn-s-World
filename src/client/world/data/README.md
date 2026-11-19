# World data

`layout.json` is the geographical source of truth for the town: the 80 x 60 tile
grid, elevation, water, roads, buildings and their footprints, connections,
props, fences, walls and districts.

**Do not edit it without the owner's approval.** It was copied unmodified from the
Stage 2 design export. `loader.ts` validates what the renderer uses (today the
grid size, tile proportions, `heights`, `water`, `roads` and `connections`) and
refuses anything that does not match. Visual detail the file does not contain belongs in separate
renderer-side files keyed to it, never in the JSON.

Roads are rasterised to tiles (`roads.ts`) and connections are read, but neither
is drawn yet; they are used to decide which terrain steps are retaining walls
and which are climbable slopes. `level_edges` is compared with in tests only.

Fields the renderer does not read yet: `buildings`, `districts`, `props`,
`yards`, `fences`, `walls`, `vegetation`, `field_types`, `checks`.

## Terrain boundaries are derived

`level_edges` gives only totals (slope 152, castle 96, cliff 56, wall 133, bank 4),
not locations, so the material of each step is derived in
`../terrain/edges.ts`. Castle (96), cliff (56), bank (4) and slope + wall (285)
match the file exactly; the slope / wall split is 166 / 119 here against
152 / 133 in the file, an approximation documented in ADR-018.

## Known gaps against the Stage 2 v2 artwork

These are drawing-level details the file does not describe. They are not map
errors and need no change to the JSON.

- Forests, orchards and tree species. `vegetation` lists only 5 willows and 32
  reed clusters.
- Roof colours, building heights and architectural variants, including the
  taller v2 castle.
- Chimneys, smoke, stall colours, crops and the rocky outcrops under the castle.

## Unresolved data issues

Found while reading the file. **Left unchanged on the owner's instruction**, to be
resolved before building entrances and interactions are implemented. The file's
own `checks.door_issues` is empty, so its validator does not catch these.

| Buildings (id: name) | Shared door tile |
|---|---|
| 54 "Family" and 89 "Family" | [4, 38] |
| 70 "Row" and 71 "Cottage" | [53, 16] |
| 79 "Cottage" and 92 "Cottage" | [37, 51] |

Two buildings cannot both use the same door tile. Each pair needs a decision: move
one door, or confirm that the buildings genuinely share an entrance.
