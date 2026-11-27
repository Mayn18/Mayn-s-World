# World data

`layout.json` is the geographical source of truth for the town: the 80 x 60 tile
grid, elevation, water, roads, buildings and their footprints, connections,
props, fences, walls and districts.

**Do not edit it without the owner's approval.** The owner authorised the Stage 3 road and
Stage 4 ecology changes on the `feat/town-world-redesign` branch (see below).
`layout.original.json` is the untouched
Stage 2 export and the way back: copy it over `layout.json` to undo the redesign.
The data loaders validate what the renderer uses: grid size, tile proportions,
`heights`, `water`, `roads`, `connections` and vegetation placement coordinates.
They refuse anything that does not match. Visual detail the file does not contain
belongs in separate renderer-side files keyed to it, never in the JSON.

## Redesign changes (branch `feat/town-world-redesign`)

- Stage 1, castle hill: the outer ward is raised to level 5 and an inner ward to level 6, with
  level 4 shelves for the barbican and the postern. Walls now stand on the hill edge. New
  buildings 96 to 101 (North Tower, two Barbican Towers, two Keep Gate Towers, Barracks,
  Storehouse); building 80 was removed to make room for the barbican. Castle Road now runs
  straight down from the gate; Keep Steps and Ward Walk are new. `level_edges` castle and
  cliff totals were updated to the new derived counts (78 and 110).

Roads are rasterised to tiles (`roads.ts`), then drawn with their ramps, stairs,
bridge decks and the market square by `roads/` and `render/`. `level_edges` is
compared with the derived terrain in tests only.

Fields the renderer reads: `heights`, `water`, `roads`, `connections`, `buildings`, `walls`, `props`,
`yards`, `fences`, `vegetation` (willows, reeds, orchards, hedgerows and windbreaks) and
`field_types` (`data/decor.ts`). Not read: `districts`, `checks`.

## Terrain boundaries are derived

`level_edges` gives only totals (slope 152, castle 96, cliff 56, wall 133, bank 4),
not locations, so the material of each step is derived in
`../terrain/edges.ts`. Castle (96), cliff (56), bank (4) and slope + wall (285)
match the file exactly; the slope / wall split is 166 / 119 here against
152 / 133 in the file, an approximation documented in ADR-018.

## Ecology data

The Stage 4 map data names four orchard trees, four hedgerow tiles and three
windbreak trees. Other forest, lawn and riverbank plants are placed by
`decor/plan.ts` from deterministic rules. The two millrace water tiles meet the
existing stream at the water mill; `water` remains the source of truth for the
channel and its banks.

## Remaining visual details

These are drawing-level details the file does not describe; they are not map
errors and need no change to the JSON.

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
