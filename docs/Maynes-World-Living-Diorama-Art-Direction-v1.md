# Mayn's World — Living Miniature Diorama Art Direction (v1)

**Status:** proposal. Art direction and technical analysis only. Nothing proposed in this document has been implemented. **Revision 2 (2026-11-23)** adds §11 (visual art audit), §12 (correction backlog) and corresponding updates to §1.5, §8.4 and §10; §11.1 states what was and was not visually inspected. **Revision 3 (2026-11-24)** adds §13 (structural-integrity audit of buildings, roofs, castle and painter order, 20 issues SI-1 to SI-20), the new milestone **VQ0**, approval items S12 to S15 and the matching changes to §1.5, §8.4, §10 and §12. §13.1 states what was and was not inspected. Nothing in revision 3 is fixed or implemented.

**Basis:** a read-only audit of branch `feat/town-world-redesign` at `74b19bb` (2026-11-23), plus `docs/Maynes-World-Art-Direction-v3.md` from the same branch. `main` contains none of the renderer; the implementation lives on that branch. No source file was modified, nothing was committed or pushed, and no branch was changed.

**Evidence tags** (same convention as v3): **[M]** measured by reading the code or data. **[E]** estimate or arithmetic from constants. **[?]** unknown, not measured. Every numeric visual value is a **starting value to tune by eye**, marked **[tune]**. The art audit in §11 uses its own codes for visual evidence (**V**, **V+S**, **S**, **N**), defined in §11.1.

**Not done in this audit:** no repository build, no tests, no profiling, no motion capture. In revision 1 nothing was rendered; in revision 2 the real source was bundled into a scratch harness and rendered in headless Chrome (still frames only; see §11.1 for exactly what was captured and what was not). The checked-in screenshots in `docs/screenshots/` are dated 2026-11-20 and predate the ambient, lighting and theme commits of 2026-11-22/23, so they are not evidence of current behaviour. Statements in §§0–10 that were marked [M] or [?] before revision 2 were not re-checked visually unless §11 says so.

**Relationship to v3.** v3 is the static-art, theme and cache specification. This document is the **life and light layer** on top of it: how the finished town lights up, moves and is inhabited. v3's milestone statuses are stale: commit subjects show M4–M8, T1–T3 and an ambient foundation have landed (I read commit subjects and code, not acceptance results). Where this document disagrees with v3, the disagreement is listed in §0.3 and needs the owner's approval.

---

# 0. Ground rules

## 0.1 Inherited from v3 Part 0 (unchanged)
Preserve world layout, footprints, destinations, camera, the Canvas 2D renderer, depth order and the adaptive-resolution cache. No `Math.random()` in anything visible; all variation is a pure function of `(seed, entityId, world coordinates, time)`. No pixel readback per frame. No new dependencies, workers or WebGL. DOM navigation and destination hotspots stay unobstructed. Colours stay in `themes.ts` and are derived with `mix`; no new hex values in painters (v3 H2).

## 0.2 New rules for this track

| ID | Rule | Why (evidence) |
|---|---|---|
| **R1** | **Level of detail keys on effective scale, never on raw camera zoom, and never as a hard threshold.** Effective scale `s = view.scale` (CSS pixels per logical pixel, `fit.scale × zoom`). Each effect declares a smooth ramp (§5). | `ambientLod.ts` thresholds use camera zoom (its own comment says so). The fit scale differs ~3.7× between a 1440 px desktop and a 390 px phone [E], so "zoom 1.55" means different things on each. Hard cutoffs (`actorsVisible` at 1.55; firefly counts 4/12/20; water stride 3/2/all) make things pop. |
| **R2** | **Pixel-grid discipline in the overlay.** Positions snap to integer logical pixels in world space; effects use `fillRect`/pixel helpers, not antialiased paths (`arc`, free polygons). | Smoke is drawn with `ctx.arc(...).fill()` at fractional positions (`ambientPainter.ts` `paintSmoke`) [M]. Canvas path fills are antialiased regardless of `imageSmoothingEnabled`, so smoke will read as soft circles against crisp baked pixels. Cloud shadows are also antialiased diamonds (visual check needed [?]). |
| **R3** | **Overlay painters are data-driven.** They read capability parameters (`emissive`, `weather`, `life`), never `theme.id`. | Hard-coded ids today: `paintNightLights` (cozy-night), `paintFireflies` (enchanted-forest), `paintWeather` (rainy-evening, snowy-cabin), ripples in `waterEffects.ts` [M]. Window halos therefore cannot appear in Sunset, Snowy or Rainy even though those themes bake lit windows. |
| **R4** | **One clock, one wind.** All ambient motion derives from a shared deterministic `ambientClock(t)` and `wind(t, x, y)`. No effect owns a private sine. | Today each effect has its own period (`time/1600`, `/740`, `/2600`, `/17000`…) so nothing reacts together, which is what reads as mechanical [M]. |
| **R5** | **Restraint and photosensitivity.** Nothing flashes more than 3 times per second; light flicker amplitude ≤ 12 % of intensity; no lightning, strobe or full-screen flashes. Ambient frame cap stays 30 fps. | Accessibility. v3 D8 caps ambient at 30 fps. |
| **R6** | **Classification stays strict.** Baked into the cache only if static **and** depth-dependent (shadows, spill, wet/snow tones, lit-window fills). Overlay only if animated, additive or screen-space. | v3 rules 0.3.2, 0.3.3, 0.3.7 and ADR-023. |
| **R7** | **Every animated element has a static equivalent** drawn when motion is off, hidden-tab paused, or reduced motion is set. | Existing `animated` flag and `AmbientScheduler` already supply this (§8.1). |
| **R8** | **Budget.** Overlay work ≤ 4 ms median per ambient frame on an ordinary desktop (v3 D8); measured by LD0 before more is added. | Nothing is measured today [?]. |

## 0.3 Deliberate deviations from v3 (need owner approval)

| ID | v3 says | This document proposes | Why |
|---|---|---|---|
| **D-1** | "Foliage sway is **not** planned" (D7) because moving baked trees ghosts. | Wind is shown on vegetation by three non-ghosting methods: travelling canopy glints, falling leaves/petals, and an overlay-only meadow layer (tufts, flowers). Full tree sway stays out. | The brief asks for vegetation that responds to wind. These methods respond without erasing baked pixels. |
| **D-2** | A4: NPCs "with silhouette occlusion", zero cost when zoomed out; actors hidden below a zoom threshold. | Actors never vanish: at aerial scale they become 2×3 px coloured dots, at mid a simplified sprite, at close the full sprite. | "Avoid effects that abruptly disappear." |
| **D-3** | Moon/stars flagged in C3 (`stars` sky flag) but not implemented. | Stars and a moon disc added in the **CSS sky** (not canvas). | Cozy Night currently has no sky features [M: no star/moon/haze code in TS or CSS]. |
| **D-4** | Haze is a final build pass (C2 `haze`), not implemented. | Implement as the single uniform final pass at the end of the cache build, as v3 already allows. | No haze exists [M]; it is the cheapest atmosphere gain. Counted as a cache change, so it triggers the rebuild guard. |

## 0.4 Structural items that need approval (not assumed)

| ID | Item | Default |
|---|---|---|
| **S10** | Raise `MAX_ZOOM` or add a per-viewport max zoom so a phone can reach mid/close scale. At 390 px wide, zoom 4× gives `s ≈ 0.70` [E], barely above desktop *aerial* (`s ≈ 0.64` at 1440 px). Mid and close detail is effectively unreachable on phones. | Do not change the camera; flag the limitation. |
| **S5** (v3) | Surroundings for the slab (soft horizon, table or mist). The aerial view shows a floating slab on a flat gradient. | Visual only; camera bounds unchanged; needs approval. |
| **S12** | Painter-order change for 7 footprint pairs (SI-3): a per-building anchor or a pairwise "behind" test in `buildings/scene.ts`. It touches the baked-cache paint order but is not a renderer rewrite. | Do not change; flag. |
| **S13** | Which of the 44 edge-touching building pairs are intentional terraces and which are accidents (SI-9). Any gap, merge or footprint change follows from the answer. | Do not move or resize any building; painter fixes only. |
| **S14** | Keep crown (SI-15): is the flat pale top a deliberate roof terrace or an unfinished roof? | Treat as an open question. |
| **S15** | Mill waterwheel (SI-12, AR-9): omit the wheel, show it on another face, or add a painted millrace. | Leave as is. |
| **S11** | New small baked art for light spill (ground wedges, door shafts). Increases cache build work. | Allowed within the v3 D6 rebuild guard; report cost. |

---

# 1. Overall visual philosophy

## 1.1 The idea
Mayn's World is a **model of a town that someone is quietly looking after**. It is not a game map that waits for input. The visitor should be able to leave the tab open, glance back, and always find something slightly different: a chimney that has stopped smoking, a lamp that has been lit, a villager now sitting where nobody was.

## 1.2 Seven principles

1. **Light tells the hour; activity tells the life.** Each theme is one fixed moment (Meadow late morning, Sunset dusk, Night, Rainy Evening, Forest twilight, Snowy Cabin late afternoon). Light establishes the moment; routines show what people do *at that moment*.
2. **Small, specific, motivated.** Every moving or glowing thing has a cause: smoke because a hearth is lit, a lit window because someone is home, a figure at the pier because a boat is moored there. No decorative sparkle without a source.
3. **Restraint.** At aerial scale the eye should find *one* thing alive at a time. Motion density rises with zoom (§1.4).
4. **Organic, never metronomic.** Periods differ per instance, driven by one slowly varying wind; gusts travel across the map as a front; pauses are irregular.
5. **Continuity across zoom.** A thing is present at every scale, drawn at the fidelity that scale can bear. Detail fades in per element, not per camera threshold.
6. **Same town, different hour.** A theme changes light, weather, who is out and what they do. It never changes geography, destinations or content (ADR-007).
7. **Crisp miniature.** Everything stays on one pixel grid with flat, material-led shading and selective warm/cool light. Glow is stepped (rings), not blurred.

## 1.3 What "alive" does and does not mean
It means routines, reactions (birds scatter when a villager walks near; villagers shelter under awnings in rain), and environmental storytelling. It does **not** mean a simulation: no needs, inventory, pathfinding across the whole map or combat (v1 exclusions; ADR-006 avatar stays optional and independent).

## 1.4 Life budget by scale (what a visitor can notice at once)

| Scale | Individually noticeable motions on screen | Character |
|---|---|---|
| Aerial (`s < 0.9`) | ≤ 8 | Slow, large: wind-bent smoke columns, a gust moving across the forest, glints on the river, cloud shadows, a few dots moving on streets, windows warming |
| Mid (`0.9 ≤ s < 1.8`) | ≤ 20 | Architecture and routines: flags, signs, smoke, working figures, boats, birds crossing |
| Close (`s ≥ 1.8`) | ≤ 40 | Behaviour and stories: breathing animals, flame flicker, sweeping, chatting pairs, petals, ripples |

Counts are per viewport and are caps, not targets.

## 1.5 Overall visual priorities (revised after the §11 audit)

The audit changes the order of work. The town's static art is strong at its best (market square, cathedral, timber facades, Snowy Cabin), so the biggest gains come first from **repairing what undermines the default view and each theme's identity**, and only then from adding life.

0. **Make the town structurally sound first** (§13): the keep's turrets and the painter order, wall-to-tower contact, roof junctions and touching buildings (SI-1 to SI-20). Detail, light and animation applied to a broken shape are wasted, so VQ0 comes before VQ1.
1. **Make each theme's light do its job** (LI-1 Night, LI-2 Sunset). A theme that is only a colour grade is the largest gap between what the theme promises and what the visitor sees.
2. **Fix the most repeated and most visible shapes**: the castle's tower masonry (CA-1) and the river's zigzag shoreline (TE-1).
3. **Ground the first impression on phones** (CO-1), which needs the S10 camera decision.
4. **Fill the unfinished areas and the empty streets** (TE-2, NP-1) with decor and population, not new systems.
5. **Remove the "pasted-on" details** (dormer boxes, ghost patches, bare door lots, repeated boulders) and the antialiased shapes that clash with the pixel style.
6. **Then add life and light features** in the order given in §10 (wind, clouds, agents, wildlife, weather).
7. **Keep what works**: the flat, clean look, the light direction and the composition are protected by §11.2 and §12.5.

---

# 2. Lighting and atmosphere direction

## 2.1 Starting point (what the code actually does)
- **One fixed key direction:** left-hemisphere light; shadows fall east (+x) onto same-level ground only. Casters are buildings, castle pieces and wall tiles; length = `min(2.6, max(0.7, height/22)) × shadow.lengthScale`, capped at 3.5 tiles; one or two alpha steps with head/tail fading (`buildings/scene.ts`) [M].
- **Trees and props already cast ground blobs** (offset ellipses, 0.3/0.42 × shadow opacity) and have contact bands at trunk bases (`decor/plants.ts`, `decor/props.ts`) [M]. Facades have stepped eave and base bands and dark window reveals (`buildings/painter.ts` ~272–289, ~352) [M]. Earlier "no contact shadows" statements in v3 Part A are out of date.
- **Theme parameters exist** for key light, shadow, surface (wet/snow/puddles), water (frozen, reflection), emissive (windows, lamps, pools) and accent glow (`themes.ts`) [M]. **`keyLight.kind` and `keyLight.elevationDeg` are declared and never read** [M]; shadow length comes only from the separate `lengthScale`. Light colour and intensity are read, but only to tint the highlight tone (`buildings/palette.ts:94`).
- **Emissive:** baked lit-window fills chosen per window by `seededWindowLit`, baked lamp ground pools (a single flat diamond, radius `poolRadius × 14` lp, alpha `poolStrength × 0.36`), and an overlay "glow" that is a 2×2.5 px square at ~0.11 alpha per lit window and 3×3 at ~0.2 for lamps, **Cozy Night only** (`ambientPainter.ts paintNightLights`) [M].
- **Absent [M]:** haze, vignette, stars, moon, sun disc, visible clouds, hearth/chimney glow, torch flicker (torches are static flames in `castle.ts`), light spill beyond the lamp diamond, reflections of lights, rim light.

## 2.2 Directional lighting: make the existing key light legible

**Goal.** A visitor should be able to point at the sun (or moon) without it being drawn.

| # | Improvement | What the visitor sees | Mechanism (cache, same tile slot) |
|---|---|---|---|
| L-1 | **Make `keyLight.elevationDeg` real.** Derive shadow length scale and a rim-light strength from it instead of the separate magic `lengthScale`. Keep `lengthScale` as a clamp. | Low sun (Sunset 14°) gives long, soft-tailed shadows and warm rims; high sun (Meadow 50°) gives short crisp ones; diffuse themes lose direction. Change is explained by one number per theme. | Pure function in palette/shadow derivation; no painter imports theme (R6). |
| L-2 | **Rim light on lit edges.** A 1 lp light-coloured line on the left/top edges of roofs, tower drums and tree crowns, strength from `keyLight.intensity × (1 − elevation/90)`. | At Sunset every roof ridge and tower left side has a thin warm gold edge; at noon almost none. Shapes pop at aerial scale. | Painters already receive `lightExposure`; extend `Tone.light` use, no new colours (`mix`). |
| L-3 | **Shadow silhouettes follow form.** Replace rectangular slabs with stepped shapes: gabled roofs give a stepped peak, round towers a capsule, tree crowns blobs. Same slot, same-level rule. | Shadows read as "a house", "a tower", "a tree" instead of identical bars. | Extend `buildShadowMap` span data with a per-caster profile (width taper by distance). |
| L-4 | **Cloud shadows get visible clouds** (§3.9) and use the same shadow direction (east), sliding along the key-light vector, not a Lissajous wobble. | Dark patches stop looking like stains; they belong to something overhead and drift with the wind. | Overlay. |
| L-5 | **Haze final pass** (D-4): one vertical gradient (colour, strength, bias from `haze` parameters) at the end of the cache build, stronger toward the far (north) edge. | Distance reads: the castle's forest backdrop recedes into cool or warm air; Rain/Snow/Forest gain depth immediately. | One `fillRect` with gradient at build time; no per-frame cost. |

**Avoid.** Soft blurred shadows (ADR-024), shadows on facades or cliff faces, any whole-world multiply layer composited over the cache (no depth knowledge, v3 D4).

## 2.3 Light sources: stronger and more convincing

The model has four layers. Each layer has one owner (cache or overlay):

1. **Core** (baked): the lit window fill, lamp lens, flame pixels. Exists for windows and lamps.
2. **Spill** (baked, depth-correct): warm light landing on nearby surfaces.
3. **Halo** (overlay, additive): soft glow around the source, stepped as 2–3 concentric pixel rings.
4. **Flicker** (overlay): small, irregular intensity changes.

| Source | Today [M] | Direction: what the visitor sees | Mechanism |
|---|---|---|---|
| **Lit windows** | Baked fill; faint 2×2.5 px overlay square in Cozy Night only | A lit window looks warm and *occupied*: a 1 lp bright core, a 3 lp low-alpha halo that is cooler toward the edge, and a small warm wedge on the ground or sill in front of ground-floor windows. Some windows dim and relight on a 40–180 s cycle (someone moving about). Works in every theme with `windowFraction > 0` (R3). | Halo from the existing `windows` anchors (`chance < windowFraction` stays the single rule, so halo and baked fill always agree). Wedge baked at the building's tile slot, S11. |
| **Lamp posts** (23) | Baked flat diamond + 3×3 overlay square | A stepped two-ring pool on the street (bright inner, dim outer), a halo around the lantern, and slow ±8 % breathing. On wet roads the pool smears into a short vertical reflection streak. | Pool: baked, extend `paintLampPool` (two diamonds, wetness adds an elongated quad). Halo + breath: overlay. |
| **Castle gate torches** | Static flame (`castle.ts torch`) | Three-frame flame (2 px wide), irregular flicker, an ember pixel rising every few seconds, warm pool on the gate stone and path. | Flame core baked as "flame frame 0"; flicker/ember overlay from new torch anchors (the same registry pattern as `castleBannerAnchors`). |
| **Chimneys / hearths** | Smoke only | When the window below is lit, a 2 px orange ember pulses at the chimney rim (≤ 0.4 Hz) and the underside of the smoke column is tinted warm at night. | Overlay, from existing chimney anchors; tie to the building's lit-window hash so it is consistent. |
| **Forge (Smith ×1, Workshop ×1)** | None | Doorway pulses orange; a spark pixel arcs out every 3–6 s while the smith "works" (§4). | New anchors for these two kinds only. |
| **Doors of inns, taverns, cafés (inn ×1, taverns ×2, cafés ×2)** | None | At dusk/night a short warm rectangle of light falls on the step and street in front of the open door. | Baked wedge (S11). |
| **Signal Lab (destination)** | None | A slow beacon pulse (≤ 0.5 Hz, low amplitude) as a quiet "GitHub lives here" cue. | Overlay; must not cover the DOM hotspot. |
| **Water** | Shimmer strokes only | At night the lit windows and lamps next to the river appear as short, broken vertical columns on the water, clipped to water tiles (boathouse, warehouses, wharf). | Overlay, clipped to water tiles; only for sources within 2 tiles of water. |

**Starting values [tune].** Window halo radius 3 lp, alpha 0.10 → 0.04 across rings. Lamp halo radius 6 lp, ring alphas 0.16/0.07; pool radius from existing `poolRadius`. Flicker: sum of two incommensurate slow sines, amplitude 6–12 %, no component faster than 2.5 Hz (R5). Window re-light cycle 40–180 s, per-window hash for phase.

## 2.4 Depth, contact and architecture
Already present: contact bands, eave bands, reveals [M]. Remaining gaps, all **baked in sequence** (no new passes):

- **Wall-base dirt/damp band** on shaded east faces, 1 lp, darker in Rainy.
- **Under-awning shadow** on the façade beneath each market stall and awning (4 stalls; striped awnings on shops).
- **Tree-to-building overlap shade:** where a tree canopy overlaps a wall in the cache, a 1-step darker patch on the wall. Needs depth-order check in the painters before attempting [?].
- **Stair and terrace lips:** 1 lp light line on the top edge, 1 lp shadow on the riser (castle hill, Crown Terrace).

## 2.5 What must feel genuinely different
| | Daytime Meadow | Sunset Dream | Cozy Night | Rainy Evening |
|---|---|---|---|---|
| Light feels like | Clear, high, neutral-warm | Low, orange, directional | Cool moon, warm pools | Flat, soft, no direction |
| Shadow | Short, crisp, cool blue-violet | Long (≈2–3.5 tiles), violet, soft tail | Moon shadows, dark navy, moderate | Almost none (opacity 0.1) |
| Where the eye goes | Landmarks by value | Rims and long shadows | Lit windows and lamps | Wet streets and lamp smears |
| Emissive | None | A few warm windows, weak lamps | 60 % windows, bright lamps and halos | Few windows, lamps with reflections |

The full six-theme table is in §6.

---

# 3. Environmental animation direction

## 3.0 The shared wind and clock (new foundation, R4)

**What it is.** A pure function `wind(t, x, y) → {dx, dy, strength}`:

- A slow base direction (period ~2–4 min) and base strength per theme (Rainy: moderate, Snowy: low, Enchanted: very low and swirling, Sunset: moderate, Night: low, Meadow: gentle).
- **Gust fronts:** every 20–45 s (hashed interval, no `Math.random`) a front travels diagonally across the map at ~6–10 tiles/s; at a point `(x, y)` the gust arrives at `t − distance/speed`. Everything that reacts to wind reacts when the front passes it.
- Strength output in 0…1; amplitude consumers multiply by their own gain.

**What the visitor sees.** Smoke bends together, flags snap, the forest edge glints in a sweeping wave, petals lift, rain slants a bit more, and then it settles. This single mechanism is what separates "alive" from "several unrelated animations".

**Consumers:** smoke (§3.2), flags/banners/signs (§3.3), canopy glints and falling leaves (§3.4), grass/flowers (§3.4), rain slant, snow drift, clouds, birds' flight lines, water ripple direction.

**Cost:** a handful of sine evaluations per consumer; no allocation per frame.

## 3.1 Water, rivers, waterfalls, reflections

**Today [M].** Baked water with depth steps, checker highlights and a pale shore line (`render/waterPainter.ts`); overlay: short horizontal shimmer strokes on ~28 % of water tiles (alpha 0.16), rain ripples on ~8 % of water tiles, three streaks on each cascade face, two foam dashes per bridge edge. Frozen water skips all of it. Boats (4) are static props.

| # | Direction | What the visitor sees | Notes |
|---|---|---|---|
| W-1 | **Flow along the river.** Shimmer and foam travel along the local river direction instead of a fixed horizontal drift. Direction per tile from the neighbouring water-run axis (derived from the mask, geography untouched). | The river visibly *runs* downstream; bends and straight runs read differently. | Derive once at build; store 1 byte per animated tile. |
| W-2 | **Sun glints as pixels, not lines.** In sunny themes, 1×1 bright pixels appear and fade at hashed positions (0.3–0.8 s each), denser where the sun-reflection band lies (screen-left of centre). | Daytime river sparkles; Sunset river carries a warm orange band; frozen water gets rare static ice glints. | Replaces long strokes for day themes; keeps them subdued for night/rain. |
| W-3 | **Sky reflection tint** is already a theme parameter (`water.reflection`); also drive the glint colour from it. | Sunset river is warm, Enchanted teal, Rainy flat grey. | Palette only. |
| W-4 | **Waterfalls:** 5–6 streaks at varied speeds, a mist puff pair at the base (2–3 px, alpha 0.2, rising and dissipating), and a foam ring pulse. | A waterfall has a head, body and base instead of three moving lines. | Mist uses pooled particles; hidden at aerial beyond a ramp (R1). |
| W-5 | **Boats bob** 1 lp over 4–6 s, mooring lines sway; a fisher sits in one boat (§4). | The wharf is occupied and gently moving. | 4 boat props; overlay re-draw of the boat sprite on water tile needs the occlusion technique (§4.8) or exclusion from cache via the existing `movingAnimalPropIds` pattern. |
| W-6 | **Ducks / geese** on the river (2–4), paddling slowly, leaving a 2 px V-wake. | Life on the water at mid/close zoom. | New agents (§4.6). |
| W-7 | **Ripples from interaction:** a duck dip, a dropped rain drop, a villager at the shore. | Cause and effect. | Same ring helper as rain ripples. |
| W-8 | **Lit reflections at night** (§2.3). | Wharf windows reflected as broken columns. | Overlay clipped to water. |

**Avoid.** Building mirror reflections (v3 removed: expensive, low value), caustics, per-tile uniform shimmer in lockstep.

## 3.2 Smoke and chimney activity

**Today [M].** For each chimney anchor with `smokeSeed ≤ 0.6` (≈60 % of chimneys), three filled circles in `palette.white` with fixed offsets, radius 1.9/2.4/2.9 and alpha 0.5/0.36/0.24, bobbing ±0.8 px on a per-chimney sine. No rise, no spread, no wind, antialiased edges. When motion is off the same three puffs are drawn static.

**Direction.**
- **A rising column of 5–7 pooled square puffs** per active chimney: each puff is born at the chimney rim, rises 14–26 lp over 6–9 s, widens 2 → 4 px, fades to 0, and drifts with `wind(t, x, y)`. Puff phases are staggered so the column never pulses in unison.
- **Chimney activity is a schedule, not a constant.** Each chimney has a hashed duty cycle (on 60–180 s, off 30–120 s). Bakery, Smith, Tavern and Inn chimneys are almost always on; cottages follow their window light at night.
- **Smoke obeys the theme:** Meadow light grey and thin; Sunset underside tinted warm; Night near-invisible except where lit from below; Rainy short, heavy, bending low; Snowy tall and nearly vertical with white-blue tint; Enchanted pale green-grey, slow.
- **Static equivalent (R7):** one column frozen at its mid-life shape, same size and opacity as the animated mean, so toggling motion off does not change the picture's weight (v3 D8 already requires matching size and opacity).

**Visitor sees:** a town where every chimney has its own habit; a gust makes the whole column field lean for a few seconds.

**Zoom:** smoke stays visible at every scale (v3 D8). At aerial scale only the lower 3 puffs are drawn, as a single 3×6 px smudge; at close all puffs.

## 3.3 Flags, banners, signs, hanging objects

**Today [M].** A single triangle per flag with one vertex waving ±1.2 px on a 740 ms sine, fixed colour (`awnRed`), same for building flags and castle banners.

**Direction.**
- **Cloth as 3 segments** whose phase offsets travel along the cloth (a visible travelling wave), amplitude from `wind`, plus a pole-end tug. Rain: limp and low. Snow: stiff. Gust: a snap.
- **Colour and shape by owner**: castle banners two-colour (keep and gatehouses differ), harbour pennants blue, market bunting along the Market Square stalls, plain red for houses.
- **Hanging signs** (inn, taverns, shops) swing 2–4° with wind and a slow settling decay after gusts.
- **Lanterns** on posts and the observatory sway 1 px.
- **Awnings and laundry** (4 laundry props, 4 stalls): the free edge flutters 1 px; laundry lines belly out in gusts.

**Visitor sees:** at mid zoom the castle's banners snap together when a gust arrives; at close zoom the market stall awnings ripple.

**Static equivalent:** the existing flat pose.

## 3.4 Vegetation, grass and flowers

**Constraint:** baked trees must not be moved (ghosting; v3 D7 and D-1).

| # | Direction | What the visitor sees | Mechanism |
|---|---|---|---|
| V-1 | **Canopy glints.** Tiny 1–2 px light/dark specks (alpha 0.2–0.3) at crown-top anchors, switched on by the passing gust front and lingering 0.5–1.5 s. | A visible wave of "wind through the forest" sweeping across the Northern forest and the orchard strips. | Overlay; anchors from `decorPlan.plants` (the same source `fireflies` already uses). No erase needed (additive). |
| V-2 | **Falling leaves and petals.** From blossom and autumn trees: 1 px particles, slow spiral, ≤ 12 on screen, landing and fading. | Pink petals near blossoms, a few orange leaves near autumn trees. | Pooled particles seeded by tree hash. |
| V-3 | **Meadow life layer.** New overlay-only tufts and flower heads on open meadow tiles; bend with gusts; flower heads nod. Only on tiles that are free of nearer occluders (reuse the `cloudSafeTiles` idea plus a "nothing in front within 3 tiles" check) so no erase is needed. | At close zoom, the grass in the Eastern meadow moves; at aerial it is invisible and fades in with scale (R1). | New decor drawn only on the overlay; never baked. Requires approval as a "new capability". |
| V-4 | **Willows and reeds** (5 willows, 32 reeds): reed heads bend with wind; willow fronds shimmer via glints. | The river bank moves slightly differently from the forest. | Overlay; reeds are low and unoccluded. |
| V-5 | **Snowy:** snow shed from branches in gusts: a puff of 3–4 white pixels falling from a crown. Enchanted: glowing seed motes lift from canopies. | Weather-specific wind responses. | Pooled particles. |

**Not proposed:** swaying whole baked tree sprites, per-tree independent animation for every tree.

## 3.5 Birds, insects, small wildlife
**Today [M]:** none. (Fireflies exist for Enchanted Forest only, 20 anchors, drawn as 2×2 squares, visible by zoom steps.)

| Creature | Theme(s) | Behaviour | Count cap |
|---|---|---|---|
| **Swallows/swifts** | Meadow, Sunset | Flocks of 3–5 crossing the town on a long arc at tower height, occasionally circling the cathedral tower and keep | 2 flocks |
| **Sparrows** | Meadow, Snowy | Hop and peck in the plaza and at the market; scatter when a villager passes within 1.5 tiles, return after 4–10 s | 8 |
| **Crows** | Rainy, Snowy, Sunset | Perch on castle walls and roof ridges; one lands every ~30 s | 4 |
| **Butterflies** | Meadow | Float over flower fields and the Eastern meadow, erratic 2-frame wings | 6 |
| **Dragonflies** | Meadow, Sunset | Hover and dart over water | 3 |
| **Bats** | Cozy Night | Erratic flight around the cathedral tower and lantern posts | 4 |
| **Fireflies** | Enchanted (full), Cozy Night (few, near water) | Slow drifting pulses with soft 3 px halo; never faster than 2.5 Hz | 20 / 8 |
| **Ducks** | all but Snowy | See §4.6 | 4 |

**Visitor sees:** sparrows exploding off the plaza when a villager walks by; a bat flicker around the lit bell tower. Each creature has a static fallback (R7) or is simply not drawn when motion is off.

## 3.6 Fire, lanterns, windows
See §2.3. Fire gets a three-frame pixel flame with irregular timing; windows get halo and an occupancy cycle; lanterns breathe. All flicker obeys R5.

## 3.7 Weather

**Today [M].** Rain: ≤110 slanted 3×8 px streaks, alpha 0.18, fixed slant, screen-space (independent of the world), plus ripples on ~8 % of water tiles. Snow: ≤74 1.6 px squares with a slow sine drift. Particle count scales by `zoomFactor` and `deviceFactor`. Both only for hard-coded theme ids.

| # | Direction | What the visitor sees |
|---|---|---|
| WX-1 | **Two depth layers** (far: shorter, fainter, slower; near: longer, brighter) for rain and snow. | Weather has depth, not a flat screen overlay. |
| WX-2 | **Wind slant** from `wind()`: rain leans more in gusts; snow drifts. | Weather is part of the same air as the smoke and flags. |
| WX-3 | **Puddle ripples and splashes.** Puddle tiles are already deterministic (`hasWetPuddle(x, y, density)` in the terrain painter); drive a small ring + 2-pixel splash on each visible puddle tile at hashed intervals. | Rain visibly lands *in the street puddles*, not only on the river. |
| WX-4 | **Mist** along the river and between the forest and the castle: two thin low-alpha bands that drift slowly (Rainy, Enchanted). | Depth and mood at aerial scale. |
| WX-5 | **Breath puffs** for villagers and animals in Snowy: a 2 px white puff every 3–5 s when idle. | Cold, close-up warmth. |
| WX-6 | **Sheltering behaviour** (§4): people use awnings in rain. | Weather changes behaviour. |

**Excluded:** lightning and screen flashes (R5), thunder, fog that reduces label legibility.

## 3.8 Clouds and sky
**Today [M]:** a CSS gradient sky; the canvas draws cloud *shadows* (three ellipses of tile diamonds, alpha 0.08) but **no clouds**. CSS drift animations exist only for the legacy `MeadowScene`.

- **Visible pixel clouds** (cluster of 5–8 rects using the existing `cloud` / `cloudShade` theme colours) float above the three cloud anchors, offset along the light vector from their shadow. They are drawn at aerial and early mid scale and fade out by `s ≈ 1.5`, so at close-up the sky is unobstructed.
- **Stars and moon** (D-3) for Cozy Night as CSS gradient layers; slow opacity twinkle on a few stars, static when reduced motion.
- **Sun:** no disc (the sun is implied by rim light and shadows); optionally a faint warm glow in the sky gradient at the screen-left horizon for Sunset.
- **Horizon (S5):** optional mist band at the slab's base.

## 3.9 Pacing summary
Slow things are slow (clouds 60–180 s, smoke 6–9 s), small things are brief (glints 0.3–0.8 s), and no two instances of anything share a period.

---

# 4. NPC and animal behaviour direction

## 4.1 Starting point [M]
- **Static villagers:** up to 22 placed on road/plaza tiles by hash (`decor/plan.ts`), each a 4×10 lp block figure; five shirt colours, two hair colours, a single skin tone (`pal.m.wallSand.lit`), a fixed 2×2 shadow (`decor/props.ts paintVillager`). They never move (actual placed count not executed [?]).
- **Moving actors:** 2 walkers and 2 animals, selected from the above and from sheep/cow props. A walker takes a BFS route of 5–14 tiles over road/plaza tiles, walks there, pauses 1.5–5 s, and walks the **same route back** (`ambientScene.ts updateWalkerPosition`). Animals only sway ±0.07 tiles. There is no walk cycle, facing or role.
- **Visibility:** actors are drawn only when `cameraZoom ≥ 1.55`.
- **Occlusion:** each moving actor is drawn into a 64×64 buffer, then every nearby occluder tile (up to an 11×11 window, filtered to tiles that paint after the actor and are in `occlusionTiles`) is re-painted with `destination-out` using the full `scene.paintTile`, **every frame** (`ambientPainter.ts paintActorOcclusion`). Correct, but cost grows with actor count.
- **World ingredients available:** 98 buildings (26 cottages, 9 family houses, 6 row houses, 4 stalls, 2 taverns, 1 inn, 1 smith, 1 bakery, 2 cafés, 2 farms, 2 barns, windmill, mill, stables, barracks, lodge, cathedral, six destination buildings), 128 props (23 lamps, 14 benches, 22 barrels, 15 woodpiles, 11 crates, 7 carts, 6 sheep, 4 cows, 4 boats, 4 laundry, 3 hay, 3 hives, 3 practice dummies, scarecrow, net, 2 wells, 5 troughs), 10 wall runs, and 12 named districts (Northern forest & highlands, Eastern meadow, Castle Hill, Castle Approach, Crown Terrace, Terrace Row, Market Square, Eastgate, Lantern Quarter, Maker's Yard, Riverside Lower Town, East farmland) [M].

## 4.2 Direction: routines, not simulation

**Agent model.** An *agent* is `{ id, role, home, stations[], routine[], speed, look }`.
- `stations` are fixed points of interest (POIs) derived from existing data: stall tiles, bench tiles, well tiles, pier ends, field edges, door tiles, wall-walk tiles.
- A `routine` is a short loop of 3–6 *beats*: `walk(to)`, `work(at, 8–40 s)`, `rest(at, 15–60 s)`, `chat(with, 6–20 s)`, `watch(…)`.
- Durations are hashed per agent so loops drift out of phase.
- **Routes** are graph routes over road/plaza tiles between stations (not out-and-back on one random route), with speed variation, accelerate/decelerate at ends, and occasional small detours.
- **No global schedule or clock**: time is scaled, so every visit shows a different slice. The theme biases which beats are likely (§6).

## 4.3 Appearance variety

Current variety is 5 × 2 variants of one block figure [M]. Direction:

| Axis | Today | Proposed (all derived with `mix`, no new hex, v3 H2) |
|---|---|---|
| Skin tone | one | Four to five, mixed from `wallSand`, `wallBrick`, `doorWood`, `roofThatch` |
| Hair/headwear | 2 hair colours | Hair (3 colours), straw hat (farmer), cap (fisher), tall hat (merchant), hood (rain/snow), helmet (guard), coif (baker), bare head (child) |
| Silhouette | 4×10 | Adult 4×10, child 4×7, broad 5×10 (porter), robed 4×11 (cleric/pilgrim) |
| Clothing | 5 shirt tones | 5 base tones × apron/cloak/tabard overlay (1–2 px) |
| Carried items | none | Basket, bucket, broom, hoe, crook, fishing rod, lantern, bundle, shield-pole (1–3 px each) |

**Walk cycle.** Two frames alternating legs every 0.25–0.35 s at walking speed, 1 lp body bob, facing indicated by held item and hat brim shifting left/right (sprite remains pixel-symmetric otherwise). Idle: 1 px breathing every 2–3 s. All figures remain readable as flat colour blocks (v3 "silhouette first").

## 4.4 Roles and district behaviour

| District / place | Roles and what the visitor sees |
|---|---|
| **Market Square** (4 stalls, fountain, benches) | Vendors rearrange crates at stalls (2-frame arm), a shopper browses then walks to the next stall, children circle the fountain and pause, two villagers meet and chat (facing each other, a 2 px speech tick appears above one, never text), someone sits on a bench for 20–60 s |
| **Castle Hill / Approach / Eastgate** (6 gates, 10 wall runs, barracks, stables, 3 dummies) | Guards stand at gate pairs (rooted, a one-pixel torch beside them at dusk), a patrol walks the wall tops on a long loop, a stable hand carries a bucket, recruits hit the practice dummies (2-frame swing), a horse in the stables yard (new small asset, optional) |
| **Crown Terrace / Terrace Row** (cathedral, terrace homes) | Pilgrims and a robed cleric on the cathedral steps, a resident shakes a rug, a child runs between terraces |
| **Lantern Quarter** (lamps, cafés, taverns, inn) | A **lamplighter** walks street to street at dusk themes and "lights" each lamp (the halo switches on as he reaches it), café patrons sit at tables, door light spills in the evening |
| **Maker's Yard** (workshop, smith, carts, woodpiles ×15, barrels ×22) | Smith hammers at the forge (2-frame, spark pixel, doorway glow), a porter pushes a handcart between woodpiles and a stall, a carpenter saws at a woodpile |
| **Riverside Lower Town** (pier, net, 4 boats, boathouse, 4 laundry) | A fisher sits on the pier with a rod (float bobbing), another mends the net, a washerwoman hangs cloth on the laundry lines (cloth belly in gusts), a dockhand carries sacks between warehouse and boat |
| **East farmland / Eastern meadow** (fields, haystacks, hives, scarecrow, windmill, mill, granary, farms, barns) | Farmers hoe crop rows (2-frame, slow), a farmer forks hay, a beekeeper stands still near hives, a **shepherd** walks slowly with sheep and a dog, a miller carries a sack into the mill, windmill sails turn (see below) |
| **Northern forest & highlands** (lodge, logs) | A woodcutter at the lodge, deer at the forest edge at twilight themes (new optional asset), birds |

**Destination life (cues only, never obstructing hotspots).** The Post Office has a courier going in and out; the Library has a lit reading window; the Workshop has forge sparks; the Signal Lab has a slow beacon pulse; the Town Hall has its clock; Mayn's Cottage has constant chimney smoke and a cat sitting on a sill at dusk themes.

**Windmill and mill.** Windmill sails and the mill wheel (a prop wheel is drawn in the east farmland screenshot) turn slowly, a classic miniature signal of life. Both are baked today; rotating them requires a cache-excluded "no-sails" variant plus an overlay sprite (the same split v3 A2 uses for cloth). Mark as optional.

## 4.5 Movement and pauses (believability)
- **Avoid:** constant speed, out-and-back on one route, all actors pausing for the same duration, perfect straight stops.
- **Do:** speed 0.18–0.34 tiles/s with ±15 % per agent and ±10 % jitter per leg; 0.3 s ease in/out; pauses 1.5–40 s depending on beat; 10–20 % of legs include a micro-pause (look around); two agents meeting within 1 tile may exchange a beat (`chat`) only if both are between routine beats; every pause beat has an animation (not just standing).
- **Reactions (cheap and charming):** sparrows scatter, villagers step off the road for a cart, people in rain walk 1.25× faster and head to the nearest awning if within 6 tiles, sheep lift heads when the dog passes.

## 4.6 Animals

| Animal | Where | Behaviour | Static fallback |
|---|---|---|---|
| **Sheep** (6 props, East farmland pasture) | Pasture fence | Graze (head-down 2-frame, 8–20 s), lift head, shift 1–3 steps, keep within 1.5 tiles of the flock; huddle under trees in Rainy | Existing sprite |
| **Cows** (4) | Meadow | Slow chew (2-frame), tail flick pixel, lie down mid-day or at night (lying sprite variant), rise slowly | Existing sprite |
| **Chickens** (new; farms ×2, barns ×2) | Farmyards | Peck/scratch, hop, scatter 2 tiles when a villager passes | Not drawn |
| **Dog** (new, 1–2) | Follows the shepherd; sleeps near the Tavern door | Trots, sits, tail wag | Not drawn |
| **Ducks** (new, 2–4) | River | Paddle with V-wake, dip (ripple), nap on bank | Not drawn |
| **Horses** (new, optional, stables) | Stables yard | Stand, swish, graze | Not drawn |
| **Cat** (new, 1) | Cottage sill / wall at dusk | Loaf, tail flick, jump down | Not drawn |
| **Deer** (new, optional) | Forest edge in Sunset, Enchanted | Stand, step, raise head, leave | Not drawn |

All 10 existing animals animate, not 2. They are culled by viewport plus margin so animating all costs only what is in view.

## 4.7 Population and scale (continuity, R1, D-2)

| Scale | Rendering | In-viewport cap |
|---|---|---|
| Aerial | A 2×3 px shirt-colour dot plus 1 px shadow; no walk cycle; only *moving* agents, ≤ 8 | 8 |
| Mid | Simplified sprite (shirt + head, 2-frame legs), props visible at hands | 20 |
| Close | Full sprite, carried items, breath puffs, speech ticks | 40 |

Globally ≈ 36–48 agents plus animals, always culled to the viewport. Agents outside the viewport pause their animation but keep their routine clock (their phase is a pure function of time, so no catch-up cost).

## 4.8 Making that affordable: occlusion
Per-frame occlusion by re-painting up to ~60 tiles per actor [E] will not scale to dozens of agents. The world is static, so the "what paints in front of this tile" mask is static:

- **Cache a front-occluder mask per walkable tile**, lazily, in a small atlas: 64×64 px alpha mask of everything that paints after an actor standing on that tile (terrain faces + `scene.paintTile` for later tiles), built once in time-sliced steps the first time any agent routes through it.
- Each frame: draw the agent into its buffer, `destination-out` the cached mask, draw the buffer.
- **Memory [E]:** 16 KB per mask; 500 route tiles ≈ 8 MB. Build only tiles that routes use. Masks are theme-dependent only if occluders change shape (they do not; colours do not matter for an alpha mask), so a theme switch does not rebuild them. They depend on terrain level changes, so a mask keys on `(tile, level)`.
- **Risk:** the mask must match sub-tile positions. Mitigation: agents snap to 4 sub-positions per tile for mask lookup, or restrict agents to tile centres on stairs/ramps (levels change there).
- **Gate:** LD5 prototypes this first on 8 agents and reports ms/frame before scaling. If a mask cannot be built correctly for a tile, that tile is excluded from routes rather than risking visible artefacts.

---

# 5. Zoom-level detail strategy

## 5.1 Scale definitions

`s = view.scale` is CSS pixels per logical pixel. `fit.scale` is `min(viewportW / boundsW, viewportH / boundsH)` and camera zoom multiplies it.

| Viewport | Bounds width 2240 lp [M] | `s` at zoom 1 [E] | `s` at zoom 4 [E] | Villager (10 lp) at zoom 1 / 4 |
|---|---|---|---|---|
| 1440×900 desktop | width-limited | ≈ 0.64 | ≈ 2.57 | 6.4 px / 25.7 px |
| 1920×1080 | width-limited | ≈ 0.86 | ≈ 3.43 | 8.6 px / 34 px |
| 390×844 phone | width-limited | ≈ 0.17 | ≈ 0.70 | 1.7 px / 7 px |

**Phones never reach mid scale** at the current 4× cap (S10). Until S10 is decided, phones get aerial-grade life only (wind, smoke, windows, glints, dots), which is acceptable and needs to be said out loud so it is not mistaken for a bug.

## 5.2 The three experiences

| | Aerial `s < 0.9` | Mid `0.9 ≤ s < 1.8` | Close `s ≥ 1.8` |
|---|---|---|---|
| Visitor impression | A beautiful, coherent model with a few slow signs of life | A town with architecture and routines | A set of small stories |
| Light | Shadows, rim light, haze, lit-window specks, lamp specks | Window and lamp halos, door light, torch flames | Spill wedges, flame flicker, ember pixels, window re-lighting |
| Animation | Wind-bent smoke, gust wave in forest, river glints, cloud shadows and clouds, moving dots | Flags, signs, birds crossing, working figures, boats, petals | Cloth waves, tufts bending, breath puffs, animal micro-motions, mist, splashes |
| NPCs / animals | Dots only | Simplified sprites | Full sprites, items, speech ticks |
| Environmental storytelling | Colour of districts, which chimneys smoke | Props active (sweeping, hoeing) | Small narrative moments (lamplighter reaches a lamp and it warms) |

## 5.3 No popping: the rule
Replace every threshold with a **per-element ramp**:

`presence(e, s) = smoothstep(s0, s1, s)` (0 below `s0`, 1 above `s1`), and an element is drawn when `hash(e) < presence × density`, with alpha also scaled by `presence`.

Because each element has its own stable hash, raising zoom adds elements gradually and *the same* ones every time; nothing flickers in and out when the camera crosses a line. Effects that scale (smoke puffs, glints) use the continuous `presence` to change count/size, not on/off.

## 5.4 Per-effect ramps (starting values [tune], in `s`)

| Effect | Starts | Full | Notes |
|---|---|---|---|
| Wind-bent smoke (lower 3 puffs) | always | – | Visible at every scale (v3 D8) |
| Smoke (all puffs) | 0.7 | 1.2 | |
| Flags / banners | 0.5 | 0.9 | Banners earlier (landmarks) |
| Cloud shadows + clouds | always | clouds fade out 1.2 → 1.8 | Clouds recede when the visitor is "in" the town |
| River glints | 0.4 | 1.0 | Density ramp, not stride (replaces `waterTileEffectVisible`) |
| Waterfall streaks / mist | 0.6 / 1.0 | 1.2 / 1.8 | |
| Moving agents as dots | always | – | Dots (≤ 8) |
| Simplified sprite | 0.9 | 1.3 | Crossfade dot → sprite over this range |
| Full sprite details | 1.5 | 2.2 | Items, breath, speech tick |
| Animals (animate) | 0.9 | 1.4 | Static sprites remain baked at all scales |
| Birds | 0.5 | 0.9 | |
| Insects (butterflies, dragonflies) | 1.2 | 1.8 | |
| Fireflies | 0.8 | 1.8 | Replaces the 4/12/20 steps |
| Window halos | 0.7 | 1.3 | Specks at aerial from the baked fills |
| Lamp halos | 0.5 | 1.0 | Lamps are landmarks of the night themes |
| Torch/fire flicker | 1.0 | 1.6 | |
| Canopy glints | 0.5 | 1.0 | |
| Meadow life layer (tufts) | 1.6 | 2.4 | Only at close |
| Rain/snow | always | – | Screen-space; density ramp from existing `zoomFactor` smooth |
| Puddle splashes | 1.0 | 1.6 | |

## 5.5 Pixel consistency at close-up (R2)
The cache is a power-of-two tier capped at 64 MiB; at high DPR and max zoom it is **upscaled** with nearest-neighbour (`cacheResolution.ts`, ADR-023) [M]. Overlay content is drawn at true buffer resolution. If overlay art is not snapped to the logical-pixel grid, close-up scenes will mix coarse baked pixels with finer overlay pixels. Rule: overlay positions and sizes are integers in world (logical) pixels; effects are made of `fillRect`s of integer size.

---

# 6. Theme-specific visual and behavioural differences

Time of moment: **Meadow** late morning, **Sunset** dusk, **Night** deep night, **Rainy** evening rain, **Forest** twilight, **Snowy** late afternoon in winter.

| | **Daytime Meadow** | **Sunset Dream** | **Cozy Night** | **Rainy Evening** | **Enchanted Forest** | **Snowy Cabin** |
|---|---|---|---|---|---|---|
| **Key light** [M params] | Sun 50°, white, 1.0 | Sun 14°, `#ffb27a`, 1.1 | Moon 45°, `#9fb4e8`, 0.65 | Diffuse, `#b6c1cf`, 0.6 | Filtered 40°, `#b8ffd9`, 0.6 | Sun 25°, `#e8f0ff`, 0.7 |
| **Shadow** | `#3a3d6a` 0.34, ×0.85 | `#3b2060` 0.45, ×1.35 | `#0a0f28` 0.35, ×1.0 | `#2a3140` 0.10, ×0.55, 1 step | `#0a2a33` 0.40, ×0.85 | `#5a6fa0` 0.30, ×0.72 |
| **Signature lighting (new)** | Crisp contrast, almost no rim | **Warm gold rim light** on every left edge, long violet shadows with fading tails, glow in sky at left horizon | **Pools**: lamp pools, door light, lit windows with halos, moon-cool everything else; stars and moon | **Wet streaks**: lamp smears on roads, window glow muted, no shadow direction; mist bands | **Teal canopy light**, glowing accent points, faint rim in canopy, deeper haze at low bias | **Cool blue shadows against warm windows**, snow rim light on white surfaces, window spill on snow in front of doors |
| **Haze (D-4)** | 0.05 upper | `#f0a0a0` 0.12 | `#1c2750` 0.10 | `#9aa5b0` 0.18 | teal 0.15 lower | `#e8eff7` 0.14 |
| **Sky** | Blue gradient, small clouds | Violet → pink → orange, tinted clouds | Navy, **stars, moon**, thin clouds | Grey, thick cloud layer | Teal green, faint glow bands | Pale blue-grey, white clouds |
| **Windows (baked fraction)** | 0 | 0.08 | **0.6** | 0.16 | 0.12 (cool) | 0.4 |
| **Window halos (new, R3)** | none | weak warm | **strong** | weak, rain-diffused | cool green | warm, strongest contrast to snow |
| **Water** | Sunny glints | Warm orange reflection band | Dark water, moon glints, light reflections | Flat grey, rain ripples, splashes | Teal, wisps of mist | **Frozen**: no flow, rare ice glints |
| **Wind** (base strength) | Gentle | Moderate, long smoke | Low | Moderate, rain slant | Very low, swirling | Low, smoke nearly vertical |
| **Smoke** | Light grey | Underside warm | Lit from below | Short, heavy, bent low | Pale green-grey, slow | Tall, white-blue, near vertical |
| **Weather** | – | – | – | **Rain** two depths, puddle splashes, mist | Drifting motes | **Snow** two depths, branch snow-shed, breath puffs |
| **Fireflies / glow** | – | – | few, near water | – | **many**, with halos; glowing mushrooms/accent points | – |
| **Birds / insects** | Swallows, sparrows, butterflies, dragonflies | Swallows heading home, crows, cat on wall | Bats, owl silhouette, few fireflies | Crows (perched), ducks sheltering | Owls, fireflies, bats | Robins/sparrows near woodpiles, crows |
| **NPC mood** | Busy: market full, farmers working | Winding down: baskets home, shutters, lamplighter begins | Few, close to lit buildings; lantern carriers, patrol with torches; most animals sleeping | Hurried, hooded, umbrellas, sheltering under awnings | Slow wanderers with lanterns | Hooded, stoking fires, carrying logs, breath puffs |
| **Animals** | All active | Heading to shelter | Lying/asleep, dog by the Tavern | Sheep huddle, ducks on bank | Deer at forest edge | Few, cows lying, sheep close together |
| **Destination cues** | Post courier active | Library window warm | Library, Signal Lab lit; Cottage smoke | Cottage window warm; Post door light | Library cool glow | Cottage cosy: smoke + lit window |
| **Emphasis for performance** | Most NPCs, most birds | Longest shadows (largest bake) | Most light sources (halos) | Most particles (rain) | Most particles (motes, fireflies) | Particles + frozen (cheaper water) |

**Guardrails per theme (inherits v3 C4):** stone mortar lines and roof identity remain legible; left-lit/right-shaded face order never flips; halos never reduce DOM label contrast; weather never hides destination markers.

---

# 7. Concrete visual examples and expected outcomes

Each example states what the visitor sees, at which scale, and how it can be checked.

### E-1 Market Square at Cozy Night (close)
**Seen:** the fountain basin holds a faint moon glint. Three lamp posts each throw a two-ring warm pool onto the pale paving and breathe slowly; the baker's window glows, its chimney carries a thin column with a warm underside; a lamplighter reaches the fourth lamp and the pool brightens as he stops; two villagers pause at the fountain facing each other; a bat flits past the lamp and is gone.
**Check:** lamp halos present with `theme.id` unused (R3); no element flashes > 3 Hz; labels remain legible; frame cost within R8.

### E-2 Castle approach at Sunset Dream (mid)
**Seen:** the curtain wall and drum towers have a thin gold edge on their left sides; shadows stretch ~3 tiles east in violet with soft tails; the two gate torches flicker 3-frame; banners snap together when a gust crosses; crows perch on the wall and one flies off; guards at the gate stand rooted, a patrol walks the wall top.
**Check:** rim light present only when `elevationDeg` is low; shadow still on same-level ground only; hotspots not covered.

### E-3 The river and wharf in Daytime Meadow (mid → close)
**Seen:** pixel glints twinkle on the water, denser on the left side of the river; the shimmer travels downstream; moored boats bob; a fisher on the pier jerks the rod and a ripple spreads; two ducks paddle with V-wakes.
**Check:** no glint pattern repeats on a tile grid (hash per pixel, not stride); frozen water skips motion only in Snowy.

### E-4 Rainy Evening street (close)
**Seen:** rain in two depths slants slightly more as a gust passes; puddles show splash rings; a lamp's pool stretches into a streak on the wet road; smoke from the tavern stays low; three villagers hurry under an awning and wait; a sparrow stays on the ridge.
**Check:** splashes only on puddle tiles (same deterministic function as the baked puddles), no lightning, particle count within `deviceFactor` caps.

### E-5 Snowy Cabin at dusk (mid)
**Seen:** smoke rises nearly straight; windows glow warm against blue-white roofs; a gust makes snow slide from a pine; villagers in hoods carry logs with breath puffs; frozen water has two slow glints.
**Check:** warm window halos strongest here by contrast; snow tones on roofs unchanged (baked).

### E-6 Enchanted Forest edge (close)
**Seen:** a gust sweeps teal canopy glints across the treeline; 20 fireflies pulse slowly with soft 3 px halos; glowing accent points on a few crowns; a deer stands at the forest edge and lifts its head as a villager walks by.
**Check:** no firefly pulses faster than 2.5 Hz; count follows presence ramp, not 4/12/20 steps.

### E-7 Daytime Meadow aerial (aerial)
**Seen:** nothing obvious until you look: a gentle lean in the smoke columns, a lighter wave moving across the Northern forest, a faint cloud and its shadow crossing the meadow, 4–6 coloured dots moving along streets, river glints.
**Check:** no moving element is individually distracting; the static frame (motion off) looks complete and has the same weight (R7).

### E-8 Farm Eastern meadow (close)
**Seen:** a shepherd walks slowly with a dog; sheep graze with head-down animation and one lifts its head; cows chew; chickens scatter as the farmer passes; tufts of grass bend with gusts; windmill sails turn.
**Check:** meadow life layer only on tiles with no nearer occluder; animals within pasture fence; windmill (if included) uses a no-sails baked variant.

### E-9 Smith and workshop (close)
**Seen:** a hammer swing every 1.2 s for 6–10 s then a pause; each strike a spark pixel arcs out; the doorway pulses orange; the neighbouring Workshop (Projects destination) has quiet smoke.
**Check:** pulse and spark timing within R5.

### Expected outcome summary
A first-time visitor should say "the town is alive and cosy" in the first ten seconds without being able to name one animation; a second-time visitor should find a new small story each minute; and a visitor with reduced motion should see a calm, complete, convincing still (R7).

---

# 8. Audit of existing implementations

## 8.1 Existing capabilities worth retaining

| Capability | Where | Why keep |
|---|---|---|
| Single flattened, depth-ordered cache with synchronous 1× tier and 3 ms sliced high-res tier; nearest-neighbour compositing; theme-keyed rebuild with cancellation | `TownCanvas.tsx`, `render/cacheResolution.ts`, ADR-023/024 | Proven, depth-correct; this is what makes the overlay affordable |
| Overlay canvas, `pointer-events: none`, shared view transform (`setWorldTransform`), redrawn on camera change and by the scheduler | `TownCanvas.tsx`, `styles.css` | Exactly the architecture v3 D7 prescribed |
| `AmbientScheduler`: 30 fps cap, hidden-tab stop, motion-off and reduced-motion handling, static frame on policy change | `ambient/animationScheduler.ts`, `animationPolicy.ts`, `useAmbientMotion.ts` | Meets R5/R7 already; add to it, do not replace |
| Static/animated split with `animated` flag everywhere and cache exclusion lists (`movingFigureTiles`, `movingAnimalPropIds`, `animatedStatic: false`) | `ambient/ambientScene.ts staticCachePaintOptions`, `decor/layer.ts` | The pattern for "remove from cache, redraw in overlay" already works; reuse for boats, windmill, cloth |
| Anchor registry for smoke, flags, banners, windows, lamps, fireflies built once from painters | `ambientScene.ts`, `buildings/painter.ts` anchors | Windows anchor `chance` matches the baked `seededWindowLit` (same hash seeds 271/272), so overlay and baked lit windows always agree |
| Actor occlusion by `destination-out` repaint of nearer tiles | `ambientPainter.ts paintActorOcclusion` | Correct; optimise (§4.8), do not discard |
| Complete six-theme data model: key light, shadow, surface (wet, snow, puddles), water (frozen, reflection), emissive, accent | `themes.ts` | Rich enough to drive almost everything here |
| Baked theme-specific surfaces: snow caps on roofs/trees/ground, wet sheen and puddles, lit windows, lamp pools, frozen water, accent glow points | `buildings/painter.ts`, `decor/plants.ts`, `render/terrainPainter.ts`, `terrainPalette.ts` | Depth-correct per-surface states, as v3 specified |
| Ground shadows with head/tail alpha steps, tree and prop blobs, contact bands, eave bands, window reveals | `buildings/scene.ts`, `decor/plants.ts`, `decor/props.ts`, `buildings/painter.ts` | A good form-lighting foundation |
| Deterministic hashing (`hash2`), pure functions, pooled seed arrays for particles | `buildings/random.ts`, `ambientScene.ts particleSeeds` | Matches the determinism rule |
| Viewport/device-aware particle count (`deviceFactor`, `zoomFactor`) | `ambientPainter.ts paintWeather`, `TownCanvas.tsx` | Reuse for all particle effects |
| Dev-only tooling guarded by `import.meta.env.DEV` (metrics, preview themes) | `TownCanvas.tsx` | Extend for LD0 profiling |
| Accessible DOM navigation, theme selector, motion toggle | `App.tsx`, `components/*` | Unchanged and untouched |

## 8.2 Improvements to existing systems

These are **system** weaknesses found by reading code. The **art** weaknesses found by looking at the rendered town are in §11 and summarised in §8.4.

| Area | Weakness (evidence) | Improvement | Visitor-visible outcome |
|---|---|---|---|
| **LOD** | Thresholds on `cameraZoom` (`ambientLod.ts`: actors ≥ 1.55; firefly 4/12/all at 1.35/2.0; water stride 3/2/all at 1.5/2.25) | Effective-scale ramps with per-element hash (§5.3) | Nothing pops; phones get a sensible aerial life |
| **Theme gating** | Overlay painters check `theme.id` (cozy-night, enchanted-forest, rainy-evening, snowy-cabin) | Read `emissive`, `weather`, `life` parameters (R3) | Halos in every theme that bakes lit windows; any future theme works without code |
| **Light parameters** | `keyLight.kind`, `elevationDeg` never read; `lengthScale` independent | Derive shadow length and rim strength from elevation (L-1/L-2) | Sunset reads as low sun for a reason |
| **Window/lamp glow** | 2×2.5 px squares at ~0.11 alpha; one flat diamond pool | Three-layer model (§2.3) | Lights look like lights |
| **Smoke** | Three antialiased circles bobbing ±0.8 px; no rise, wind or schedule | Pooled rising column, wind, duty cycle (§3.2) | Chimneys have personalities |
| **Flags/banners** | One triangle, one vertex, one period, one colour | Three-segment travelling wave, wind, owner colours (§3.3) | Banners snap with the gust |
| **Cloud shadows** | Shadows with no clouds; independent Lissajous drift; separate AA diamonds per tile | Visible pixel clouds, drift along wind/key vector, one clipped pass (§3.8) | Shadow has a visible cause; no seam lines [?] |
| **Water** | Fixed-direction shimmer strokes on ~28 % of tiles; no flow; ripples hard-coded to Rainy | Flow field, pixel glints, theme-driven (§3.1) | River flows |
| **Walkers** | 2 walkers; out-and-back on one random BFS route; no walk cycle, role or facing | Agent model, graph routing, walk cycle, appearance (§4) | Streets have lives |
| **Animals** | 2 of 10 animals animate; only a ±0.07 tile sway | All animate with behaviours (§4.6) | Pasture and farmyard live |
| **Static villagers** | Up to 22 baked figures (cap in `decor/plan.ts`), of which only 2 become walkers, so nearly the whole population never moves | Replace with agents by the same hash placement where routes allow | The street stops looking like a diorama of statues |
| **Actor occlusion** | Per frame, per actor, repaints up to ~60 tiles through the full `paintTile` [E] | Per-tile cached masks (§4.8), prototype first | Allows 30+ agents |
| **Weather** | Screen-space flat layers; Rainy ripples on ~8 % of water only; hard-coded ids | Two depths, wind slant, puddle splashes, mist (§3.7) | Rain lands where rain lands |
| **Fireflies** | Enchanted only; 2×2 squares at alpha ~0.3; stepped counts | Presence ramp, halos, optional Night variant | Magic with continuity |
| **Pixel quality** | AA `arc` for smoke, AA diamonds for shadows, fractional positions | R2: integer positions, `fillRect` puffs | Overlay looks like the baked art |
| **Frame work** | Overlay clears and redraws at 30 fps whenever animation is on; per-frame small object allocation (animal position literals, `walker.current`) | Pool objects; skip clear regions; LD0 profiling | Headroom for more life |

## 8.3 Missing capabilities worth introducing

| New capability | Why |
|---|---|
| Shared wind field and gust fronts (§3.0) | Coherence; one mechanism animates smoke, flags, forest, weather |
| Visible clouds, stars and moon, haze final pass (D-4) | Sky is a flat gradient; Night has no sky |
| Light spill baked wedges and door shafts (S11) | Convincing light on surfaces |
| Window occupancy cycle, lamplighter and torch flicker | Lights with causes |
| Wildlife (birds, butterflies, dragonflies, bats, ducks, chickens, dog, cat) | None exist |
| Role-based agents and district routines | Town has a day |
| Environmental storytelling props in motion (smith, fisher, shepherd, laundry) | Close-up reward |
| Meadow life layer and canopy glints | Wind visible on vegetation without ghosting |
| Water flow field, glint pixels, light reflections | River and wharf come alive |
| Windmill sails and mill wheel (optional, needs no-sails bake) | Classic miniature signal |

**Corrections to v3 premises (so they are not reproduced):** v3 Part A says there are no cast or contact shadows; the code already has them (v3 itself notes baked shadows in M0). v3 says no ambient animation exists; it does. v3's C2 `stars`, `haze`, `vignette` theme fields do not exist in `themes.ts` [M].

## 8.4 Existing art weaknesses (from the §11 audit)

| Group | Weaknesses (IDs in §11.3) | Worst severity |
|---|---|---|
| Structure (§13) | Keep turrets over the keep body (SI-1); 7 mis-ordered building pairs (SI-2, SI-3, SI-17); roof junctions and overhangs (SI-8, SI-10, SI-11); 44 touching pairs (SI-9); wall ends that miss tower drums (SI-13) | Critical |
| Theme light | Night lights have no effect (LI-1); Sunset low sun not legible (LI-2); Night river too bright (LI-3); unlit accents stay day-bright at night (LI-4); Rain wet cues tiny (LI-5); Enchanted fireflies are bare pixels (LI-8) | Critical |
| Landmarks | Castle drum masonry reads as ribbed silos (CA-1); keep silhouette generic (CA-2); bailey lattice (CA-3); civilian towers echo the castle (CA-4) | High |
| Terrain | Zigzag shorelines (TE-1); empty lawns (TE-2); weak waterfall (TE-3); repeated boulders (TE-4); road lattice marks (TE-5); ghost patches (TE-6); floating slab (TE-7); uniform forest (TE-8) | High |
| Buildings | Bare dormer boxes (AR-1); flat dark roofs (AR-2); Signal Lab cues (AR-3); doors on bare grass (AR-4); repeated silhouettes (AR-5); unbroken roof planes (AR-6) | Medium |
| People and animals | Empty market and districts (NP-1); identical figures (NP-2); low-detail animals (NP-3) | High |
| Effects and pixel style | Smoke, antialiased and hairline shapes (FX-1, FX-2); zoom popping (FX-3, source only) | Medium |
| Composition | Phone framing (CO-1); districts alike (CO-2) | Critical |
| Not yet verified | CA-5, CA-8, LI-6, FX-5 (marked N) | n/a |

---

# 9. Technical constraints and risks

| # | Risk | Evidence | Mitigation |
|---|---|---|---|
| T-1 | **Overlay frame cost unknown.** Overlay is cleared and redrawn at up to 30 fps over the whole viewport; every new effect adds to it | Nothing measured [?]; v3 D8 budget ~4 ms | LD0: dev-only per-effect timing meter; each milestone reports median ms and p95 |
| T-2 | **Occlusion cost scales with actors** | `paintActorOcclusion` repaints neighbouring tiles through `paintTile` per actor per frame [M] | §4.8 cached masks; gate before scaling |
| T-3 | **Overlay buffer memory** | 1440×900: ≈ 5 MB at DPR 1, ≈ 21 MB at DPR 2 [E from v3 D6] | No second overlay canvas; all new content on the existing overlay; keep the peak within v3's rule |
| T-4 | **Cache rebuild cost** for baked additions (spill, rim light, haze, shadow profiles) | v3 D6 guards: ≤ baseline +15 % / +25 % [M rules, numbers unmeasured] | Each baked change reports 1× build ms; spill wedges only on tiles within 2 tiles of a lit source |
| T-5 | **Pixel-style mismatch** (AA smoke, fractional positions, DPR upscale) | `paintSmoke` uses `arc`; cache upscale at close zoom | R2 |
| T-6 | **Mobile reach** | `s ≈ 0.17–0.70` on 390 px width [E]; max zoom 4× (ADR-022) | S10; interim: aerial-grade life on small screens; `deviceFactor` already scales particles |
| T-7 | **Determinism vs time** | Painters forbid `Math.random()`; time-based animation needs seeds | Every random-looking choice is `hash2(seed, id, tIndex)`; reserve new hash index range (App. B) |
| T-8 | **Hash index collisions** | Many indices already used (App. B) | Reserve 970–999 for new ambient indices; grep before use |
| T-9 | **Photosensitivity** | New flicker and pulses | R5: ≤ 3 flashes/s, ≤ 12 % amplitude, no strobe, no lightning |
| T-10 | **Reduced motion / toggle** | Scheduler handles it; new effects must too | R7: every effect has a static equivalent; unit tests that `animated=false` draws deterministic single frame |
| T-11 | **Label/hotspot obstruction** | v3 rule 0.3.9; destination DOM links over the canvas | Overlay effects never draw above destination marker rects; checked per milestone |
| T-12 | **Theme coupling** | `theme.id` checks in overlay painters | R3 and a grep check that overlay modules do not contain `theme.id ===` |
| T-13 | **Wind consumes everything** | One module becomes a dependency for many effects | Keep `wind()` a pure, tested function; consumers pass gains; no shared mutable state |
| T-14 | **Aerial legibility** | Too many dots/glints could clutter at aerial | Caps in §1.4; squint test; presence ramps |
| T-15 | **Assets** | New creatures, props and characters need original art | Procedural pixel rects, original shapes only (no reference sprites); colours from `mix` |
| T-16 | **Geography invariant** | ADR-024 forbids touching `layout.json` | Routes, POIs and flow fields are derived at build from existing data; no data edits |
| T-17 | **Scope creep toward RPG** | Easy to over-simulate | v1 exclusions; agents have routines only, no needs/inventory/dialog |
| T-18 | **Browser behaviour unverified** | No browser or profiling run in this audit | Marked [?] items are LD0's first task |
| T-19 | **Docs conflict** | The Project instructions say Hono/Node 24; the repository says Go (ADR-013) and Node 26 | Not rendering-related; reported separately |

---

# 10. Prioritised implementation milestones

All milestones follow the v3 working rules: one at a time, smallest change, no commits without approval, report in ≤ 15 lines, tests/typecheck/build once at the end, stop for approval. Common exclusions: no world-data changes, no camera changes (unless S10 approved), no new dependencies, no renderer rewrite.

**Revision 3 adds VQ0 ahead of VQ1.** The structural audit (§13) found defects in painter order, roof geometry and the castle that every later milestone would paint over. VQ0 therefore follows LD0 and precedes VQ1; the order below supersedes revision 2.

**Revision 2 reorders the work.** Milestones that correct existing art mistakes (VQ1–VQ3, plus the reordered LD3 and LD4) now come **before** new features (LD1, LD2, LD5 onward).

| Order | ID | Title | Fixes | Size | Priority |
|---|---|---|---|---|---|
| 1 | LD0 | Measure and guard (plus a repeatable visual capture, §11.4) | verifies CA-5, LI-6, FX-3 | S | P0 |
| 2 | **VQ0** | **Structural integrity (painter order, castle coherence, roof geometry, touching pairs, guards)** | **SI-1 to SI-20** (and the structural parts of AR-1, AR-9) | **M–L** | **P0** |
| 3 | VQ1 | Static art corrections in the baked cache | CA-1, TE-1, LI-3, LI-4, AR-1, AR-2, AR-3, AR-6, TE-4, TE-6, CA-3, TE-5 | M | P0 |
| 4 | LD3 | Light-source layer (reordered; core first) | LI-1 (Critical), LI-5, LI-8 | L | P0 |
| 5 | LD4 | Shadow and depth refinements (reordered) | LI-2 | M | P0 |
| 6 | VQ2 | Landmark and building polish | CA-2, CA-4, AR-4, AR-5, CO-2 and Low items | M | P1 |
| 7 | VQ3 | Environment, composition and population stopgap | TE-2, TE-3, TE-7, TE-8, CO-1 (S10), NP-1 (stopgap), NP-2, NP-3 | L | P1 |
| 8 | LD1 | Wind, smoke, flags | FX-1, FX-2 | M | P1 |
| 9 | LD2 | Continuous LOD, sky and clouds | FX-3 | M | P1 |
| 10 | LD5 | Occlusion cache and NPC engine v1 | NP-1 (full) | L | P1 |
| 11 | LD6 | Animals and wildlife | | M | P2 |
| 12 | LD7 | Water life | | M | P2 |
| 13 | LD8 | Weather depth | | M | P2 |
| 14 | LD9 | Meadow life layer and vignettes | | M | P3 |
| 15 | LD10 | Theme signature pass and sign-off | | M | P3 |

**VQ1 items that must wait for VQ0.** AR-1 (dormers) waits for SI-7 and SI-8 because the dormer's position depends on the roof junction rule. AR-2 (dark roofs) and AR-6 (flat roof planes) wait for SI-8 and SI-11 so that value and ridge work is done once. CA-1 (tower masonry) and CA-3 (bailey lattice) wait for SI-1 and SI-13 so that the masonry is painted on towers that are correctly seated and joined. AR-3 (Signal Lab) waits for SI-8 (it is multi-volume). TE-1, LI-3, LI-4, TE-4, TE-5 and TE-6 do not depend on VQ0 and can be split out and run first if the owner wants early gains. **LD3 core** needs only LD0; its baked door light and spill wedges (S11) wait for VQ0 because they sit on building faces. **LD4** now depends on LD0, VQ0 and VQ1. **VQ2**'s AR-4 doorsteps and AR-5 silhouettes wait for SI-9 and SI-19.

## VQ0 — Structural integrity (P0, before everything else except LD0)

- **Why first:** VQ1 to VQ3 and LD3/LD4 paint detail, light and shadow onto the town's existing shapes. Detail on a roof that does not meet its wall, or on a tower painted in the wrong order, is wasted and must be redone. §13 lists the 20 defects (SI-1 to SI-20).
- **Scope, in this order:**
  1. **Painter order** (SI-1, SI-2, SI-3, SI-4, SI-17): the keep's back turrets, and the 7 mis-ordered footprint pairs. Smallest change to the existing key in `buildings/scene.ts` and to `paintKeep`; no renderer rewrite and no new cache.
  2. **Castle coherence** (SI-13, SI-14, SI-15): wall ends meet tower drums, free ends capped, keep crown decided.
  3. **Roof geometry** (SI-5, SI-6, SI-7, SI-8, SI-10, SI-11): junction rule for multi-volume roofs, no overhang on a touching side, verge on gable ends, dormers on real planes, clock faces under the eave.
  4. **Touching pairs** (SI-9, SI-16, SI-18): classify each of the 44 pairs, then party-wall treatment for the intentional ones. Needs decision S13.
  5. **Environment and grounding** (SI-12, SI-19): mill wheel (with AR-9), plinths and contact shade.
  6. **Guards** (SI-20): tests for painter order, castle wall-to-tower contact and roof junctions.
- **Visitor sees:** a castle that reads as one fortress, houses that stand beside each other rather than inside each other, roofs that cover their walls and meet cleanly.
- **Dependencies:** LD0 (for the repeatable capture). Decisions S12 to S15 (§0.4) for the items they cover. No dependency on VQ1.
- **Systems:** `buildings/scene.ts`, `buildings/castle.ts`, `buildings/painter.ts`, `buildings/styles.ts`, `render/depth.ts` (only if the key moves), existing tests.
- **Acceptance (not met by passing tests alone).** Each is judged by looking, with the named crops listed in the milestone report:
  1. No unintended building-to-building intersection: every touching pair in §13.8 is either marked intentional with a visible shared wall, or reads as two buildings.
  2. No unexplained missing roof: every volume has a roof that covers its walls on the visible sides.
  3. No exposed wall top where a roof should be; the keep crown is either a visible terrace or roofed (SI-15).
  4. Roof junctions are coherent: a wing's ridge ends below the main ridge or a valley line shows.
  5. Castle towers and walls read as one complex: no visible gap at any wall-to-tower junction (SI-13), no isolated or floating tower, keep turrets seated (SI-1).
  6. Buildings are grounded: plinth or contact shade, no floating sections.
  7. No incorrect foreground or background order: the script check of §13.3 SI-3 passes for all pairs, and the 7 known pairs are checked by eye.
  8. No accidental overlap with roads, yards, water or waterfront (data checks of §13.2 still pass).
  9. **Aerial, mid-zoom and close-up** inspection of each corrected area, in **at least Daytime Meadow and Cozy Night**; castle and Town Hall also in the other themes.
  10. **Before-and-after screenshots** of every corrected area, from the same camera position.
  11. Intentional overlaps are kept: no artificial gaps between all buildings.
  12. `layout.json`, footprints, destinations and the camera are unchanged (byte-identical `layout.json`); output is deterministic; crisp pixel art; no new hex values.
- **Stop if:** a fix needs a footprint or placement change (report it and wait; do not move buildings to hide a rendering defect), or the cause of SI-15 or SI-3's open pairs proves different from §13.
- **Excludes:** lighting, animation, texture, new features, the S10 camera change.

## VQ1 — Static art corrections (P0)
- **Scope:** castle tower masonry (CA-1); paint-only shoreline bank treatment (TE-1); night water and night accent darkening (LI-3, LI-4); gabled dormers and roof breaks (AR-1, AR-6); Signal Lab roof cues on the pixel grid (AR-3); wider slate value separation (AR-2); boulder variety (TE-4); trace and fix the ghost patches (TE-6) and the bailey lattice (CA-3); road lattice per the owner's decision (TE-5).
- **Visitor sees:** towers that read as masonry, a river with believable banks, a night river that no longer outshines the lights, roofs without pasted boxes.
- **Dependencies:** LD0 and VQ0 for CA-1, CA-3, AR-1, AR-2, AR-3, AR-6 (see §10); LD0 only for TE-1, LI-3, LI-4, TE-4, TE-5, TE-6.
- **Systems:** `buildings/castle.ts`, `buildings/painter.ts`, `buildings/palette.ts`, `render/terrainPainter.ts`, `render/terrainPalette.ts`, `render/roadPainter.ts`, `decor/plants.ts`.
- **Acceptance:** named crops at close, mid and aerial in all six themes show the fix; `layout.json` and footprints byte-identical; no new hex values; no texture or noise (ADR-019); 1× cache build time reported against the v3 D6 guard.
- **Stop if:** a fix needs a change to world data, or the cause of TE-6 turns out to be a deliberate feature.
- **Excludes:** overlay work, new features.

## VQ2 — Landmark and building polish (P1)
- **Scope:** keep silhouette (CA-2); civilian tower re-skin (CA-4); doorsteps and path stubs on free tiles (AR-4); residential silhouette variety through existing `Appearance` parameters (AR-5); district material weights (CO-2); Low items from §12.4 only where the area is already being touched.
- **Dependencies:** VQ0 and VQ1.
- **Acceptance:** at mid zoom no more than two adjacent houses share silhouette and colour; districts distinguishable in a squint test.
- **Excludes:** moving or resizing any building.

## VQ3 — Environment, composition and population stopgap (P1)
- **Scope:** decor-only fill for the empty lawns (TE-2), a stronger waterfall (TE-3), forest clearings and fringe (TE-8), slab contact shadow (TE-7, needs S5), portrait phone framing and a higher phone zoom cap (CO-1, needs S10), more static villagers with role props (NP-1 stopgap), richer villager and animal sprites (NP-2, NP-3).
- **Dependencies:** VQ0 and VQ1; S5 and S10 decisions.
- **Acceptance:** no unfinished-looking region in the aerial view of any theme; phone first view shows the town at least twice as large as today (compare 390×844 captures); figures read as individuals.
- **Excludes:** agents and routines (LD5).

## LD0 — Measure and guard (P0)
- **Scope:** dev-only overlay profiling (median/p95 ms per effect, per frame), counts of drawn particles/agents, the effective-scale helper `effectiveScale(view)` and the presence-ramp helper, integer-snapping helpers (R2), a guard test that overlay modules do not read `theme.id`, hash-index reservation note.
- **Visitor sees:** nothing.
- **Acceptance:** baseline numbers recorded at three cameras (aerial, mid, close) on a stated machine and browser; production bundle contains no instrumentation; existing behaviour unchanged.
- **Stop if:** measuring needs structural change to the scheduler.
- **Excludes:** any visible change.

## LD1 — Wind, smoke, flags (P0)
- **Scope:** `wind(t, x, y)` module (§3.0), smoke rewrite (§3.2), flag/banner cloth (§3.3), hanging signs and awnings (small set), static equivalents.
- **Visitor sees:** smoke leans together in gusts and rises with fading puffs; banners ripple and snap; the town immediately stops looking mechanical.
- **Dependencies:** LD0.
- **Systems:** `ambient/ambientPainter.ts`, new `ambient/wind.ts`; smoke/flag anchors exist.
- **Acceptance:** every smoke column has a unique phase and duty cycle; static frame matches the mean weight of the animated one; overlay median ≤ baseline + 0.8 ms [tune]; reduced motion shows the static frame; no AA edges (R2).
- **Excludes:** vegetation, light, NPCs.

## LD2 — Continuous LOD, sky and clouds (P0)
- **Scope:** replace `ambientLod.ts` thresholds with effective-scale ramps (§5.3, §5.4); visible pixel clouds; CSS stars and moon for Cozy Night (D-3); cloud shadows aligned with the key vector; haze final pass (D-4) as a cache change.
- **Visitor sees:** nothing pops when zooming; the sky has clouds and, at night, stars and a moon; distance gains haze.
- **Dependencies:** LD0, LD1 (wind).
- **Acceptance:** a zoom sweep from 1× to 4× shows no element appearing or disappearing in a single step (screenshot sequence); desktop and 390 px phone checks; haze rebuild cost within v3 guard.
- **Excludes:** new life, spill.

## LD3 — Light-source layer (P0, reordered)
- **Scope:** R3 refactor of night lights to emissive-driven; window/lamp/torch halos for every theme with emissive values; flicker with R5 limits; window occupancy cycle; chimney ember; water reflections of nearby lights; baked spill wedges and door light (S11); two-ring lamp pools and wet streaks; smith/forge pulse.
- **Visitor sees:** lights look like lights; Night, Snowy, Sunset and Rainy each have a distinct glow.
- **Reordered by §11:** LD3 now comes before LD1 and LD2 because it repairs LI-1 (Critical). Its **core** (R3 emissive-driven halos, stepped lamp pools, door light, torch flicker, wet streaks) depends only on LD0. The parts that need the wind clock or presence ramps (window occupancy cycle, chimney embers, light reflections on water) move to **LD3b**, after LD2.
- **Dependencies:** LD0 (core); VQ0 (baked door light and spill wedges only); LD1 and LD2 (LD3b only).
- **Acceptance:** halos only where baked lit windows exist (same `chance` rule); no flash above 3 Hz; labels not obscured; 1× rebuild delta recorded and within guard.
- **Excludes:** shadow changes.

## LD4 — Shadow and depth refinements (P0, reordered)
- **Scope:** make `elevationDeg` real, rim light (L-1/L-2), form-following shadow profiles (L-3), under-awning shade, wall-base damp, stair/terrace lips; same slot, same-level rule.
- **Reordered by §11:** moves ahead of LD1 because it repairs LI-2 (Sunset). **Dependencies:** LD0, VQ0 and VQ1. It also settles CA-5 and LI-6, which need verification first.
- **Visitor sees:** Sunset reads as low sun; Meadow reads as crisp noon; towers and trees cast form-true shadows.
- **Acceptance:** no overlap double-darkening, no shadows on facades/cliffs (named crops); full rebuild within v3 guard.
- **Excludes:** any overlay work.

## LD5 — Occlusion cache and NPC engine v1 (P1)
- **Scope:** first prototype the per-tile occlusion mask cache (§4.8) with 8 agents and report ms; then agent model, POIs, graph routes, walk cycle, appearance variation (§4.2–4.3), dot/simplified/full scales (D-2), replacing the two walkers and gradually the baked static villagers by agents; district roles for Market, Lantern Quarter, Maker's Yard, Riverside, Castle gates.
- **Visitor sees:** streets and squares populated with people doing things.
- **Dependencies:** LD0, LD2.
- **Acceptance:** agents never draw through buildings or terrain faces (named crops); cap of 8/20/40 respected; mask memory reported; reduced motion shows a still arrangement.
- **Stop if:** correct masks for stairs/ramps cannot be built; exclude those tiles from routes rather than accept artefacts.
- **Excludes:** animals, wildlife.

## LD6 — Animals and wildlife (P2)
- **Scope:** animate all 10 existing animals; add chickens, dog, cat, ducks (optional horse, deer); birds, butterflies, dragonflies, bats, fireflies for Cozy Night; scatter/reaction hooks.
- **Visitor sees:** pasture and farmyard behave; birds cross the sky; sparrows scatter.
- **Acceptance:** every creature has an R7 equivalent; caps respected; no overlap with hotspots.

## LD7 — Water life (P2)
- **Scope:** flow field, pixel glints, waterfall mist, boat bob (via cache exclusion of boats), ripples, reflections of lights (if not done in LD3).
- **Visitor sees:** a river that flows; a wharf that bobs.
- **Acceptance:** frozen water skips motion; glints not on a tile grid; boats use the exclusion pattern with correct occlusion.

## LD8 — Weather depth (P2)
- **Scope:** two-depth rain and snow, wind slant, puddle splashes, mist bands, breath puffs, branch snow-shed.
- **Visitor sees:** rain landing in puddles, snow drifting, cold breath.
- **Acceptance:** particle counts within `deviceFactor` caps; no flashes; labels legible.

## LD9 — Meadow life layer and vignettes (P3)
- **Scope:** canopy glints, falling leaves/petals, meadow tufts and flowers (D-1 approval), reed bending, willow glints; destination life cues; storytelling vignettes (smith, fisher, shepherd, washerwoman); optional windmill sails/mill wheel (no-sails baked variant).
- **Visitor sees:** wind through the vegetation; small stories at close zoom.
- **Acceptance:** no ghosting (no moved baked pixels); meadow tufts only on occluder-free tiles; hotspots clear.

## LD10 — Theme signature pass and sign-off (P3)
- **Scope:** tune each theme against §6 and §7; squint tests; performance and accessibility pass (reduced motion, flicker rates, contrast); documentation of final parameters.
- **Acceptance:** each example E-1…E-9 reproducible; v3 Part G checklist plus the new rules R1–R8 all green; budgets met on stated hardware.

### Dependency summary
`LD0 → VQ1 → LD3 (core) → LD4 → VQ2 → VQ3`, then `LD1 → LD2 → LD3b`, then `LD2 → LD5`; `LD6`, `LD7`, `LD8` follow `LD5`/`LD2`; `LD9` last (needs approval D-1); `LD10` closes. VQ3 needs S5 and S10 only for its slab and phone items; the rest can proceed without them.

### Owner decisions needed before the relevant milestone
D-1 (vegetation response), D-2 (actors as dots), D-3 (CSS stars/moon), D-4 (haze pass), S5 (slab surroundings), S10 (mobile max zoom and portrait framing), S11 (baked spill), and whether to include optional assets (horse, deer, windmill sails). **New in revision 2:** TE-5 (keep or remove the road lattice marks, ADR-019) and AR-9 (mill wheel placement).

---

# 11. Existing World — Visual Art Mistakes, Inconsistencies and Quality Problems

This section audits the **finished static town as an art director would**, separately from the light, motion and NPC proposals above. It lists what makes the current world look unfinished, repetitive, inconsistent or less convincing than a detailed living miniature, and it keeps observed mistakes apart from risks inferred from code.

## 11.1 Method, evidence and limits

**What was actually done.** The real source at `74b19bb` (branch `feat/town-world-redesign`) was bundled with esbuild into a scratch harness outside the repository (the repo's own Vite build could not run: no network, no `node_modules`) and rendered in headless Chrome at device pixel ratio 1.

| Captured | Views |
|---|---|
| All six themes | Aerial, 1440×900 |
| Daytime Meadow | Close (wheel-zoomed, level not read back) at the castle, market square, harbour and river, farmland and mill, cathedral, west lawn, waterfall and east ponds; true mid zoom (≈2 wheel clicks) at the castle; phone 390×844 aerial and zoomed |
| Cozy Night, Snowy Cabin, Rainy Evening | Close at the market square |
| Sunset Dream | Close at the castle |
| Enchanted Forest | Close at the north-east forest edge |

Forest, mid-zoom market, and other regions were captured but **not inspected**, so nothing below is claimed about them. Source causes come from reading the painters named in each row.

**What was not done, and why it matters.**
- **Still frames only.** No video or frame sequence was captured, so **animation quality, popping at zoom thresholds and moving-actor occlusion were not observed**. Anything about motion is marked source-only or needs verification.
- **DPR 1 only.** High-DPI upscaling of the baked cache (§5.5) was not checked.
- **Tailwind stripped in the harness.** The corner buttons look unstyled in my captures; the UI chrome is **not judged** here.
- **No full theme × zoom grid.** Themes other than Meadow were sampled at one close region each.
- **Screenshots are not saved in the repository**, because this task allows editing only this document. Their regions are named in each row so they can be reproduced.
- **Zoom note.** Zoom levels were set by mouse-wheel clicks at the cursor (about 9 for "close", 2 to 4 for "mid"). The real zoom factor was **not read back from the app**, so "close" and "mid" are approximate labels, not measured scales.

**Evidence codes (column "Evidence").**

| Code | Meaning |
|---|---|
| **V** | Visually confirmed in a fresh render; cause not traced in source |
| **V+S** | Visually confirmed **and** the painter responsible was found in source |
| **S** | Inferred from source only; a risk, not an observed defect |
| **N** | Suspected from a still but needs a targeted look before any work starts |

**Severity.**

| Level | Definition |
|---|---|
| **Critical** | Breaks the promise of the default experience or a whole theme's identity |
| **High** | Highly visible at default (aerial) view or on the main landmark, and undermines believability |
| **Medium** | Noticeable at mid or close zoom, or in one theme; weakens polish |
| **Low** | Small inconsistency, worth fixing only when the area is already being touched |

**Style guardrails that every correction below must respect** (`CLAUDE.md`, ADR-019): clean flat-shaded surfaces, **no per-pixel texture, noise or checkerboard**, colours only through `themes.ts` and `mix`, no changes to `layout.json`, footprints, destinations or geography. Several fixes are paint-only changes inside existing tiles for that reason.

## 11.2 What already works (checked, no defect found)

Not everything is a problem, and these should not be "improved" by accident.

| Area | Observation | Evidence |
|---|---|---|
| Light direction | Left-lit, right-shaded order holds across walls, roofs, towers, stalls, trees and rocks in every sampled crop; no flipped faces | V |
| Aerial composition | Castle anchors the north, cathedral and plaza the middle, river the diagonal, forest the east; the castle silhouette reads immediately | V |
| Market square | Fountain, striped stalls, benches and cobbled plaza read as a place; props are well distributed, not cluttered | V |
| Timber-frame and brick facades | Convincing material variety at mid and close zoom | V |
| Cathedral | Twin spires of different heights, slate nave, rose window, steps: recognisable from aerial to close | V |
| Snowy Cabin | Snow on roof edges, trees and lawns is the most complete theme | V |
| Forest at close zoom | Good variety of conifers and broadleaf trees | V |
| Grass and road flatness | Flat surfaces are the owner-approved look (ADR-019), not a defect | V |
| Occlusion and floating figures | No floating or intersecting villagers seen in sampled crops (moving actors not observed) | V |

## 11.3 Issue register

Columns: **Where** (object, painter or source file), **What is wrong** (observed), **Why it weakens the diorama**, **Desired result and realistic fix**.

### 11.3.1 Architecture and buildings

| ID | Where | What is wrong | Why it weakens it | Desired result and fix | Severity | Evidence |
|---|---|---|---|---|---|---|
| AR-1 | `dormer` extra, `buildings/painter.ts` (case `dormer`, `box(... wallCream)`), added to about 35 % of one family in `styles.ts:192`. Seen on the large hip-roof buildings beside the fountain, the farm house and the harbour | The dormer is a bare cream cube sitting on the roof: no roof of its own, no window, no east-face shade | Reads as a crate or hatch pasted on, the clearest "box on a roof" in the town | A small gabled dormer using the building's roof material, one lit window, shaded east cheek. Same position, drawn in the same extras pass | Medium | V+S |
| AR-2 | Slate and dark-blue roofs (`roofSlate` and `roofBlue` materials): the large roofs in the harbour cluster, the market's south-west navy hall, the navy barn by the east ponds | They read as flat dark shapes: the lit/shade planes and course lines that warm roofs show are barely visible | At aerial scale they look like holes in the town; detail density is uneven against terracotta roofs | Widen the value gap between lit and shade planes and the course-line tone for slate through `mix` in `buildings/palette.ts`, per theme. Cause in the palette values was **not traced** | Medium | V |
| AR-3 | `signallab` style (`styles.ts:292–303`): `solar` and `mast` extras, `painter.ts` | The three blue solar panels are drawn in `roofBlue.shade` on a blue roof and are nearly invisible; the mast is 1.1 px hairlines and the dish is `ctx.ellipse` (antialiased). From above the white oval and cross-lines read like a helicopter | The one destination cue that is meant to stand out looks accidental, and its antialiased edges clash with the pixel art | Keep the intentional modern cue (it is the technology destination) but draw the dish and mast on the pixel grid with integer widths, and give the panels a lighter tone that reads against the roof | Medium | V+S |
| AR-4 | Door fronts across the west and south lots (for example the cottages beside the west lawn, market south-west corner) | Doors open directly onto flat grass with no doorstep, path stub or foundation contact | Buildings look placed on a green diamond rather than built into a lot; "pasted on" | A one-tile flagstone or beaten-earth stub from each door to the nearest road, painted on the free tile in front of the door (paint only, no footprint change), plus a stronger plinth line on the ground edge | Medium | V |
| AR-5 | Residential districts (26 cottages, 9 family houses, 6 row houses [M from §4.1]); clearest in the mid view of the market and west blocks | The dominant silhouette repeats: cream two-storey box, rectangular hip roof, red or brown. Colour varies, shape barely does | At mid zoom the town reads as the same house in several colours | Use the existing `Appearance` parameters in `styles.ts` (ridge direction, side wing, jetty, gable end) so at least three silhouettes are common in each family, without new geometry code | Medium | V |
| AR-6 | The long green-roof hall north of the fountain; the large red hall east of it | A single roof plane runs unbroken for most of the building, with only tile bands and one small cupola or chimney | Roof planes look flat and too large relative to the wall height and window detail | Roof breaks proportional to plane area: fixed AR-1 dormers, a ridge cap line, one more chimney per fixed roof area, a lit/shade ridge step | Medium | V |
| AR-7 | Every chimney (the same small red-brown box, same cap) | Identical stack on timber, brick, stone and plaster buildings, heights hardly vary | Repetition at a small, very frequent detail | Three chimney variants chosen by wall material (brick stack, stone stack, daub hood), two heights | Low | V |
| AR-8 | Window painter, all families | Same blue-grey glass and same grid rhythm on most facades | Facades look machine-stamped in a few places | Per-family glass tint and a hash-varied spacing; keep shutters and reveals as they are | Low | V |
| AR-9 | `mill` style, `styles.ts:375`, `wheel` extra | The waterwheel is painted on the east wall of the mill building on dry grass; the river is a few tiles away with no millrace | A wheel with no water breaks the story and looks decorative | Place the wheel only when the east wall faces water within 1 tile, otherwise omit it; or add a short painted millrace stub. Needs an owner decision because the mill position is fixed | Low | V+S |

### 11.3.2 Castle and major landmarks

| ID | Where | What is wrong | Why it weakens it | Desired result and fix | Severity | Evidence |
|---|---|---|---|---|---|---|
| CA-1 | `buildings/castle.ts`, `cylinderCourses` (line 247) with `COURSE_PX`: every castle drum tower, gatehouse tower and the east watchtower | Each course is a full dark ellipse arc, evenly spaced, with no staggered joints. Towers read as stacks of discs or ribbed silos, while the walls beside them use staggered brick | The most important landmark gets its most repeated texture wrong. It is visible at all three zoom levels | Staggered vertical joints on the visible half (offset every other course), lower-contrast course line, one or two belt courses, a few lighter hash-placed blocks. Geometry unchanged | High | V+S |
| CA-2 | Castle keep, `castle.ts` | The keep is a cluster of tall drums with a flat roof; it lacks a distinctive hall gable, big banner or machicolation band | The castle's silhouette is strong, but its centre is generic. Close and mid zoom can't show what the focal building is | Add a clear keep roof or hall gable, a machicolation band under the crown, a larger banner. Same footprint | Medium | V |
| CA-3 | Castle bailey and plateau ground inside the walls (mid and close at the keep) | Translucent pale-green diamond lattice over the lawn reads as glass plates or a checker overlay | Looks like a rendering artefact, and clashes with the flat-shaded rule | Paint the bailey as packed earth or flagstone from the existing road palette, or remove the lattice tint. Source of the tint not traced | Medium | V |
| CA-4 | Round civilian towers around the market and the harbour (stone drums with blue conical roofs, for example the cylinder next to the fountain-side hall) | They share the castle tower look, so the town centre is full of small castle towers | Dilutes the castle's hierarchy and makes the town read as medieval-fortified everywhere | Re-skin civilian cylinders (granary, water tower) in plaster and timber with a thatch or timber cone; keep ashlar for the castle. Inferred shared cylinder painter; verify which building kinds use it | Medium | V |
| CA-5 | Castle plateau and tower bases (Meadow and Sunset close) | No ground shadow is perceptible on the plateau grass beside the tall south-east tower and the walls | Towers appear to float on lit ground | First confirm whether shadows are too faint or missing (the same-level rule at the plateau edge is a candidate) by rendering with shadows exaggerated. Then fix or strengthen | Medium | N |
| CA-6 | East watchtower crown | A brown collar slab under a spiky pale crenellated rim reads like a flowerpot or crown of thorns; the other towers use a pale corbel | Inconsistent tower tops | Corbel band in the same stone tone with clear alternating merlons | Low | V |
| CA-7 | Curtain wall runs | Arrow-slit rhythm is identical along every long run | Mechanical repetition on long faces | Hash-vary slit positions, add a buttress or pier every few tiles | Low | V |
| CA-8 | East end of the cathedral nave: a red chimney with smoke wisps | May belong to the thatched annex behind it; if it is on the nave it is wrong for a cathedral | A chimney on the cathedral would be misplaced | Check which building owns the chimney; remove or reassign | Low | N |

### 11.3.3 Terrain and environment

| ID | Where | What is wrong | Why it weakens it | Desired result and fix | Severity | Evidence |
|---|---|---|---|---|---|---|
| TE-1 | All river reaches and ponds. The stepped outline comes from the tile-aligned water mask in `layout.json` (unchanged), drawn by `render/terrainPainter.ts` (foam line at `:130`) with bank materials from `terrainPalette.ts`; seen at the west reach, harbour, farm and east ponds | The water edge is a regular 2:1 zigzag with identical teeth. The bank has no edge material, concave or convex corner treatment | The river looks like a cut-paper ribbon or zipper; it is the most visible repeated shape in the world | Paint-only bank edge on the **land** side: hash-offset 1–2 px bank stroke, a mud or sand wedge at concave corners, rounded convex corners, reed clusters at corners. Water tiles unchanged | High | V+S |
| TE-2 | West lawn (aerial, far left) and south-west meadow; the pale east uplands near the falls | Large flat fields with a few trees and no path, wall or planting | At the default view the west reads unfinished against the dense centre and east | Decor-only additions from `decor/plan.ts`: hedgerow and low-wall lines the data already allows, flower beds, orchard rows, a footpath. Flat tones kept (no texture) | High | V |
| TE-3 | Waterfall and east pond, `ambient/waterEffects.ts` plus terrain; seen at the north-east ponds | Three faint streaks on a narrow face, no foam or splash pool, with pale grey stone blocks that look pasted at each side | The cascade is a minor detail instead of a feature | Wider face with 5–6 streaks, a foam ring at the base, rock blocks in the surrounding stone tone with shading | Medium | V |
| TE-4 | `rock()` in `decor/plants.ts:219` placed by `decor/plan.ts:246–250`; clusters at the harbour, market south-west and the farm | Five near-identical grey domes in a loose grid | Read as gravestones or mushrooms, and the repetition is obvious | Three silhouettes, two or three sizes, moss pixels at the base, spacing jitter so no two neighbours match | Medium | V+S |
| TE-5 | `render/roadPainter.ts:98`, `(kind === 'main' && (x + y) % 3 === 0)` pixel courses; plaza arcs | Faint "+" marks repeat on every third diagonal of main roads, a printed lattice | Periodic pattern on wide roads; borders on the "noisy road" look ADR-019 removed | Decide with the owner: remove from `main` roads, or only mark joints along the road direction with hash variation. No new texture | Medium | V+S |
| TE-6 | Forecourts and paving beside buildings, for example the west lawn's courtyard patch and the castle bailey | Pale-green translucent rectangles lie on top of paving with visible edges | Look like ghost overlays or hover tints | Trace the layer that paints them; then make each patch opaque paving or remove it | Medium | V |
| TE-7 | Slab edge in aerial; Snowy Cabin | The world is a slab on a flat sky gradient. In Snowy the pale ground and pale sky are close in value so the slab edge nearly disappears at the south corner | "Floating tile" feel, weak grounding | Soft contact shadow or low mist band under the slab; sky tinted a step away from the snow value. Structural, needs S5 approval | Medium | V |
| TE-8 | Forest on the east and north-east (aerial) | Evenly spaced dense conifers of uniform size form a green carpet; no clearings, no light fringe | Reads as a texture, not a forest. Close zoom is good | Density noise with clearings, size variation toward the edge, lighter broadleaf fringe, a few boulders | Medium | V |
| TE-9 | `willow` in `decor/plants.ts:133` (west bank, harbour, falls) | The willow's hanging fronds read as a jellyfish or an octopus | Odd silhouette repeated at every willow | Vertical frond strokes of alternating length over a dark interior | Low | V+S |
| TE-10 | Flat dark-green rectangles beside the farm fields (hedge or bush) | Unshaded smears | Detail density drops against nearby shaded shapes | Add a lit top and shaded side like the other plants | Low | V |
| TE-11 | Cream dashed low walls around lots, west blocks | Same dashed pattern on every lot, same height | Low-level repetition | Vary run length and add occasional gateposts | Low | V |
| TE-12 | Large diamond tone steps on lawns (south-west) | Faint tile-sized value steps are visible at close zoom | Likely the approved clean flat look, but they can read as faceting | **No change proposed**; confirm with the owner only | Low | V |

### 11.3.4 Lighting, shadows and colour

| ID | Where | What is wrong | Why it weakens it | Desired result and fix | Severity | Evidence |
|---|---|---|---|---|---|---|
| LI-1 | Cozy Night: lit windows, lamp posts, `ambient/ambientPainter.ts:261 paintNightLights`; baked lamp pool `decor/props.ts:81 paintLampPool` | Windows and lamps are lit dots with no halo or spill. The plaza is one flat value; at night the town looks like a darkened daytime scene. Overlay glow is 2×2.5 px at ~0.11 alpha, effectively invisible | The theme's identity (warm light in a cool night) is missing | Emissive-driven halos, stepped lamp pools and door light as in §2.3, with the data-driven rule R3 | **Critical** | V+S |
| LI-2 | Sunset Dream: whole town | Reads as a pink colour grade over the day scene. No long shadow or warm rim light on the castle, towers or roofs, though the theme declares a 14° sun | The low-sun mood is the point of the theme | Make `keyLight.elevationDeg` drive shadow length and rim light (L-1/L-2) | High | V+S |
| LI-3 | Cozy Night water, `render/terrainPalette.ts:107` (`shallow = mix(c.glass, c.cloud, 0.3)`) | The river is the brightest object in the night scene, a daylight periwinkle | Wrong luminance hierarchy; pulls the eye from the warm lights | Derive night water from a darker mix, add a lamp-lit highlight only near sources. Check Sunset and Enchanted water saturation at the same time | High | V+S |
| LI-4 | Cozy Night: market awnings, smoke puffs, roof reds | Awnings stay near day-bright; smoke puffs are bright white circles; roofs keep full saturation | Unlit things glow, which flattens the lit-versus-unlit contrast | Darken and cool awning and smoke tones with a night factor; keep only emissive things bright | Medium | V |
| LI-5 | Rainy Evening, whole town | Wet cues are tiny pale diamonds on roads; lamps have no reflection; the rain streaks cannot be judged from stills | The theme reads as a grey tint | Longer wet sheen on roads, lamp smears, darker wall bases; check rain in motion | Medium | V |
| LI-6 | Daytime Meadow ground shadows | Visible under stalls, benches and trees but barely distinguishable beside buildings at 1440 px | The default theme may look flat | Compare against exaggerated shadows before changing | Medium | N |
| LI-7 | Snowy Cabin | Stall awnings and villagers are unchanged from summer | Small continuity gap | Snow line on awnings, muted shirt tones | Low | V |
| LI-8 | Enchanted Forest: fireflies and accent points | Hard yellow 2×2 pixels with no halo that look like stray pixels in a still | Magic is missing; they look like noise | Soft stepped halo (overlay), slow pulse; fireflies already have anchors | Medium | V |

### 11.3.5 NPCs, animals and activity

| ID | Where | What is wrong | Why it weakens it | Desired result and fix | Severity | Evidence |
|---|---|---|---|---|---|---|
| NP-1 | Market square (about 5–6 small figures), streets, harbour pier and boats, farmland, castle gates | The places that should be busiest are almost empty and nothing in them is doing anything | The town feels abandoned, the opposite of "living" | Interim: raise the static villager count and give them role props. Real fix: LD5 agents. The cap is in `decor/plan.ts` | High | V |
| NP-2 | `paintVillager`, `decor/props.ts:341` | 4×10 block figure: 2 hair tones, 5 shirts, one skin tone, no arms, one pose | Characters read as identical pawns | Three skin tones, hats by role, arms, a carried item for 10–20 % of figures, child size (§4.3 subset) | Medium | V+S |
| NP-3 | Sheep and cows in the pasture | White blocks with a grey notch and one red block | Animals are far less detailed than buildings | Two or three poses (head up, head down, lying), a ground shadow, a cow pattern | Medium | V |

### 11.3.6 Animation, effects and pixel consistency

| ID | Where | What is wrong | Why it weakens it | Desired result and fix | Severity | Evidence |
|---|---|---|---|---|---|---|
| FX-1 | `paintSmoke` in `ambient/ambientPainter.ts:33` | Three round soft puffs in the same vertical arc over every active chimney; bright at night | Looks stamped, and the soft circles clash with crisp pixels | Per §3.2 (pooled square puffs, wind, duty cycle) | Medium | V+S |
| FX-2 | Antialiased or hairline shapes: smoke `arc`, the mast dish `ctx.ellipse`, strokes of 0.6 to 1.4 px (`painter.ts` solar, mast, hoist), cloud-shadow diamonds | Softness against crisp baked pixels | Breaks the pixel look wherever it appears | Integer widths and `fillRect` shapes; clip cloud shadows to tiles. Visible softness not isolated in stills | Medium | S |
| FX-3 | `ambient/ambientLod.ts`: actors from zoom 1.55, firefly steps 4/12/20, water stride 3/2/all | Abrupt appearance when zooming | Visible popping | Presence ramps (§5.3). A zoom sequence was not captured | Medium | S |
| FX-4 | Flags and banners | Tiny single-colour triangles, hard to see at aerial | Low-value detail | Part of §3.3 | Low | V |
| FX-5 | Cloud shadows | Not perceptible in stills | They may be too faint to matter | Judge in motion before changing | Low | N |

### 11.3.7 Composition, hierarchy and pixel consistency

| ID | Where | What is wrong | Why it weakens it | Desired result and fix | Severity | Evidence |
|---|---|---|---|---|---|---|
| CO-1 | Phone 390×844 aerial: `render/viewTransform.ts` (fit-contain, `MAX_ZOOM = 4`) | The wide slab fits by width, so the town fills about a fifth of the screen with large empty sky above and below. Four wheel clicks reached only a mid-scale view. | The first impression on phones is a tiny model; close detail is unreachable | A portrait initial framing and a higher phone max zoom. **Camera change: needs S10 approval** | **Critical** | V |
| CO-2 | Town core (Lantern Quarter, Maker's Yard, Terrace Row and similar) | Macro regions are clear (castle, forest, farm, river), but the central districts look alike | Named districts do not read as places | Per-district material and roof weights from the style palette already in `styles.ts`; district props at the edges | Medium | V |
| CO-3 | Whole town | Buildings carry far more detail than the ground, props and animals | An uneven density; part of the approved flat style | Raise props and animals toward building density; leave ground flat | Low | V |
| CO-4 | `paintVillager` and other sprites | 2-px blocks beside 1-px building detail | Slightly different pixel unit between sprites and buildings | Prefer 1-px detail on figures at close zoom | Low | V |

## 11.4 Verification still needed

| Item | What to check | Why |
|---|---|---|
| CA-5, LI-6 | Render with shadows exaggerated | Distinguish faint from missing |
| CA-8 | Identify which building owns the chimney | Cathedral or annex |
| FX-3 | Zoom-sweep capture | Confirm popping |
| FX-5, LI-5 | Recorded session | Motion and rain |
| Moving actors | Capture at zoom ≥ 1.55 | Occlusion with buildings and terrain faces |
| High-DPI | DPR 2 captures | Cache upscale at 4× (§5.5) |
| Themes | Full theme × zoom grid | Only sampled here |

## 11.5 Counts

Tallied by script from the register in §11.3 (49 rows, every row has all seven columns).

| Severity | Count | Issue IDs |
|---|---|---|
| Critical | 2 | LI-1, CO-1 |
| High | 6 | CA-1, TE-1, TE-2, LI-2, LI-3, NP-1 |
| Medium | 26 | AR-1 to AR-6; CA-2 to CA-5; TE-3 to TE-8; LI-4 to LI-6, LI-8; NP-2, NP-3; FX-1 to FX-3; CO-2 |
| Low | 15 | AR-7 to AR-9; CA-6 to CA-8; TE-9 to TE-12; LI-7; FX-4, FX-5; CO-3, CO-4 |
| **Total** | **49** | |

| Evidence | Count | Issue IDs |
|---|---|---|
| V (visually confirmed) | 30 | AR-2, AR-4 to AR-8; CA-2, CA-3, CA-4, CA-6, CA-7; TE-2, TE-3, TE-6, TE-7, TE-8, TE-10, TE-11, TE-12; LI-4, LI-5, LI-7, LI-8; NP-1, NP-3; FX-4; CO-1 to CO-4 |
| V+S (visual and source cause) | 13 | AR-1, AR-3, AR-9; CA-1; TE-1, TE-4, TE-5, TE-9; LI-1, LI-2, LI-3; NP-2; FX-1 |
| S (source only) | 2 | FX-2, FX-3 |
| N (needs verification) | 4 | CA-5, CA-8, LI-6, FX-5 |

Visually confirmed in total: **43** (V and V+S). Not visually confirmed: **6** (S and N).

---

# 12. Visual Quality Correction Backlog

The backlog separates four kinds of work so that defects are fixed before features are added, and so that not every observation becomes a new feature. Issue IDs refer to the register in §11.3; milestone IDs to §10.

## 12.0 Structural defects before everything else

The §13 register (SI-1 to SI-20) ranks above every item in §12.1. All of it is milestone **VQ0**. Suggested order inside VQ0: SI-1, SI-2, SI-3 (one painter-order change); SI-13, SI-14; SI-8, SI-10, SI-11, SI-5, SI-6, SI-7; SI-9 after decision S13; SI-12 after S15; SI-15 after S14; SI-19; SI-20 last (guards for what was just fixed). None needs a change to `layout.json` unless the owner chooses it in S13.

## 12.1 Existing defects to correct first

Ordered by severity, then by cost and by how visible the defect is at the default view.

| Rank | Issue | Correction (short) | Milestone | Size | Needs approval |
|---|---|---|---|---|---|
| 1 | LI-1 Night light has no effect (Critical) | Emissive-driven halos, lamp pools, door light; data-driven (R3) | LD3 core | M | No |
| 2 | CO-1 Phone framing and unreachable detail (Critical) | Portrait initial framing; higher phone max zoom | VQ3 | S | **Yes: S10 (camera)** |
| 3 | CA-1 Castle tower masonry (High) | Staggered joints, softer course lines, belt courses | VQ1 | S | No |
| 4 | TE-1 Sawtooth shorelines (High) | Paint-only bank edge, corner wedges and rounding, reeds | VQ1 | M | No |
| 5 | LI-3, LI-4 Night water and unlit-but-bright accents (High, Medium) | Darker night water mix; night factor on awnings, smoke, roof saturation | VQ1 | S | No |
| 6 | LI-2 Sunset low sun not legible (High) | `elevationDeg` drives shadow length and rim light | LD4 core | M | No |
| 7 | TE-2 Empty lawns (High) | Decor-only hedgerows, beds, orchard rows, paths; flat tones | VQ3 | M | No (decor only; no layout change) |
| 8 | NP-1 Lifeless market and districts (High) | Stopgap: more static villagers with role props; then LD5 agents | VQ3, then LD5 | S, then L | No |
| 9 | AR-1, AR-6 Dormer boxes and flat roof planes (Medium) | Gabled dormers, ridge caps, chimney per roof area | VQ1 | S | No |
| 10 | TE-4, TE-6, CA-3, TE-5 Boulder clusters, ghost patches, bailey lattice, road lattice (Medium) | Varied rocks; trace and fix patches; opaque bailey paving; decide road marks | VQ1 | S–M | TE-5 needs an owner decision (ADR-019) |
| 11 | AR-3 Signal Lab roof cues (Medium) | Pixel-grid dish and mast; visible panels | VQ1 | S | No |

## 12.2 Improvements to existing systems

| Issue | Improvement | Milestone | Size |
|---|---|---|---|
| AR-2 Dark roofs | Wider lit/shade values per theme | VQ1 | S |
| AR-4 Doors on bare grass | Doorstep and path stubs, stronger plinth | VQ2 | M |
| AR-5 Repeated residential silhouette | Use ridge direction, wing and jetty parameters | VQ2 | M |
| CA-2 Keep silhouette | Hall gable, machicolation band, banner | VQ2 | M |
| CA-4 Civilian towers echo the castle | Re-skin as plaster and timber cones | VQ2 | S |
| TE-3 Waterfall | Wider face, foam ring, shaded rock blocks | VQ3 | S |
| TE-8 Forest carpet | Clearings, size variation, fringe | VQ3 | M |
| TE-7 Floating slab | Contact shadow and mist band | VQ3 | S |
| CO-2 Districts alike | Per-district material weights | VQ2 | M |
| NP-2, NP-3 Villager and animal sprites | Skin tones, hats, carried items; animal poses | VQ3 | M |
| LI-5 Rain wet cues | Longer sheen, lamp smears | LD3 | S |
| LI-8 Fireflies | Soft halos, slow pulse | LD3 | S |
| FX-1, FX-2 Smoke and antialiasing | Pooled square puffs; integer widths | LD1 | M |
| FX-3 LOD popping | Presence ramps | LD2 | M |

## 12.3 New visual features

These come from the earlier sections and are **not** fixes for defects. They stay behind the corrections above.

| Feature | Section | Milestone |
|---|---|---|
| Shared wind field and gusts | §3.0 | LD1 |
| Visible clouds, stars and moon, haze | §3.8, D-3, D-4 | LD2 |
| Window occupancy cycle, chimney embers, light reflections on water | §2.3 | LD3b (after LD2) |
| Form-following shadows, under-awning shade | §2.2, §2.4 | LD4 (rest) |
| NPC agents, routines, occlusion masks | §4 | LD5 |
| Animals, wildlife | §3.5, §4.6 | LD6 |
| Water flow and glints | §3.1 | LD7 |
| Weather depth | §3.7 | LD8 |
| Meadow life layer, canopy glints, vignettes | §3.4 | LD9 |

## 12.4 Optional polish

| Item | Note |
|---|---|
| AR-7 chimney variants, AR-8 window variation, AR-9 mill wheel placement | Do only when the area is already being touched; AR-9 needs an owner decision |
| CA-6 watchtower crown, CA-7 wall slit rhythm, CA-8 cathedral chimney check | Low |
| TE-9 willow, TE-10 flat bushes, TE-11 lot walls | Small plant and fence fixes |
| LI-7 snow on awnings and clothes | Low |
| FX-4 flags, FX-5 cloud shadows | Judge in motion first |
| CO-3 detail density, CO-4 pixel unit on figures | Low |
| Windmill sails, horse, deer | Optional assets from earlier sections |

## 12.5 Deliberately not recommended

- **No texture, noise or checkerboard** on grass, roads or water (ADR-019). TE-12 is only a confirmation question.
- **No changes to `layout.json`**, footprints, destinations or geography; the shoreline, empty lawns, doorsteps and mill wheel are fixed with paint and decor only.
- **No new theme parameters** are needed for the corrections; they use existing `themes.ts` values and `mix`.
- **Items marked N in §11** (CA-5, CA-8, LI-6, FX-5) get no work until they are verified.

## 12.6 Can the current architecture support these corrections?

**Yes, without a major rewrite.** Almost every correction is a change inside an existing painter in the baked cache (`castle.ts`, `painter.ts`, `terrainPainter.ts`, `terrainPalette.ts`, `decor/plan.ts`, `decor/plants.ts`, `decor/props.ts`) or in the overlay (`ambientPainter.ts`). The cache, overlay, scheduler and anchor registry already match what the corrections need. Three places need care:

| Place | Why |
|---|---|
| Cache rebuild cost | VQ1 and VQ2 add baked detail. Each milestone reports 1× build time against the v3 D6 guard |
| `viewTransform.ts` | CO-1 needs a camera change, which is outside the current exclusions and needs S10 approval |
| Unknown sources | TE-6 and AR-2 have no traced cause yet; the first step is to trace, not to guess |

---

# 13. Structural Integrity Audit (Revision 3)

This section adds a category of defect that §11 did not cover: **the town's buildings, roofs, castle and placement are not always structurally coherent**, whatever their surface art looks like. IDs use the prefix **SI-** and are separate from AR and CA. A well-textured roof on a building that merges with its neighbour is still broken, so these defects come before the decorative work in §11 and §12.

## 13.1 Method, evidence and limits

- **Screenshots.** The five supplied screenshots were viewed at full size. They are numbered here **1 to 5** in the order supplied: **1** Water Mill, Miller's Cottage and the windmill; **2** Town Hall and its neighbours; **3** the castle keep and its towers; **4** Fish Market and Boathouse; **5** Net Loft and Wharf Warehouse. Building IDs were assigned by matching each screenshot against a render of the same source with footprint outlines and IDs drawn on it (scratch harness outside the repository).
- **Source and data.** I read `data/layout.json`, `buildings/scene.ts`, `render/depth.ts`, `buildings/painter.ts` (roofs, extras), `buildings/styles.ts` (volumes and the neighbour pass), `buildings/castle.ts` (keep, walls, towers) and the building tests. Every figure below was computed by a scratch script over `layout.json` and over the building appearances produced by `appearanceForTown`. Nothing was added to the repository.
- **Not done.** No fix was attempted, so **no defect here is fixed**. I did not run the repository's tests. I did not capture close, mid and aerial views of every building: the town has 98 buildings and I inspected only the five screenshots, the full-town render, and zoomed crops of the castle, the Town Hall block and the harbour. Where a statement rests on my own render rather than the supplied screenshots, it says so.
- **Evidence confidence:** **visual** = seen in a supplied screenshot; **render** = seen only in my own render; **source** = confirmed in code or data; **inferred** = follows from code but the picture is ambiguous; **open** = needs further inspection. Several issues carry two.
- **Cause class** (from the brief): **D** data or placement, **G** geometry, **R** rendering (order, clipping, drawing logic), **E** environmental integration, **U** uncertain.

## 13.2 What was checked and found sound

| Check | Result | Basis |
|---|---|---|
| Footprint overlap | 0 overlapping pairs among 98 buildings | script over `layout.json`; also asserted by an existing test |
| Buildings on water | 0 footprint tiles on water | script; existing test `data/buildings.test.ts` |
| Buildings straddling two terrain levels | 0 | script; existing test |
| Buildings overlapping yards | 0 | script |
| Footprint on road centre-line (width/2) | 2 buildings: Keep (7) over Keep Steps and Ward Walk, Large (69) at the start of Vineyard Walk. Both look **intentional** (the keep's own approach; the path ends at the door row), so neither is registered as a defect | script and `roads` data |
| Volumes inside footprint | holds by construction and by an existing test | `buildings.test.ts` |
| The 1-tile gap in the south curtain wall at x = 12 | **Intentional**: Pilgrim Steps run from (12.5, 15.5) to (12.5, 12) through it | `layout.json` roads |

So the environment relationship in the data is mostly sound. The structural defects are mainly in **geometry, painter order and the lack of junction handling**, not in where buildings were placed.

## 13.3 Structural issue register

| ID | Where | What is visibly wrong | Shot | Cause | Source and root cause | Severity | Confidence | Fix | Risk to geography or destinations |
|---|---|---|---|---|---|---|---|---|---|
| SI-1 | Highmere Keep (7), the four corner turrets, mainly the slim orange-coned "central tower" | A tall slim tower appears to stand on the front of the keep and ends in a flat base in mid-air, over the forebuilding parapet. It reads as a tower pasted on, disconnected from walls and ground | 3 | R, G | `castle.ts` `paintKeep`: `stoneMass` for the body (line 364) and forebuilding (393) is painted first, then all four turrets (loop after line 424) sorted only among themselves. The two **back** turrets (at 0.5, 0.5 and w−0.5, 0.5) sit behind the body but are drawn on top of it from z = 0. Which turret is the "central tower" is matched by position and by cone colour (the first two in the sort carry red cones), so that identification is inferred | Critical | visual + source | Paint the back turrets before the body (so the body hides their lower parts and they rise out of the roofline) and only the front turrets after it; check the result at three zooms. **Do not move the tower** | None |
| SI-2 | Keep Gate Tower W (99) against the Keep (7) | The lower-left gate tower is cut off behind the keep's front turret; only a stub of the drum shows | 3 | R | The scene paints a building when the painter reaches its **south-east corner tile**. Keep anchor (20, 8) → key 28; tower 99 anchor (16, 10) → key 26. 99 is south of the keep (nearer the viewer) but is painted first, so the keep covers it. Tower 100 (anchor key 30) is correct | High | visual + source | Part of the general order fix in SI-3 | None |
| SI-3 | Painter order between neighbouring footprints: 7 pairs | Buildings that should overlap in one order overlap in the other | 2, 3 | R | `scene.ts` lines 200–201 key every building by its SE corner tile and `depth.ts` sorts by x + y then x. For non-overlapping boxes the correct rule is "A before B if A.x1 ≤ B.x0 or A.y1 ≤ B.y0". My script found **7 pairs of 98 where the key disagrees**: Town Hall 0 over Market stall 37, Town Hall 0 over Multi 81, Keep 7 over tower 99, Great Hall 8 over NE Tower 10, Storehouse 102 over Gatehouse W 13 and Barbican Tower W 97, Cottage 61 over Cottage 95. Wide footprints (Keep 8×5, Hall 6×5, Storehouse 6×3) cause most of them | High | source (all 7); visual (0/81 in 2, 7/99 in 3); open (8/10, 102/13/97, 0/37, 61/95) | Change the sort key for those buildings (for example a per-building anchor, or a pairwise "behind" test for footprints); no renderer rewrite. Add a test that fails when any pair is mis-ordered | None |
| SI-4 | Town Hall (0) against Multi (81) and Clinic (42) | The Town Hall's roof and its brown hip plane run into Multi's gable end and read as one merged mass; the neighbours are hard to tell apart | 2 | R, D | SI-3 gives the Hall priority over 81. Footprints also **touch** (0/81 share 1 tile, 42/81 share 2) and the 4-floor clock tower is the tallest volume. Footprints are not changed by any of these | High | visual + source | Fix SI-3; then look again. A footprint change is **not** proposed | None unless the owner chooses a gap (decision S13) |
| SI-5 | Town Hall (0) roof | The main roof is mostly hidden behind the clock tower, leaving a detached brown triangle that looks like a gable wedge, not a hip plane. The brown colour comes from the neighbour pass, not the style (style: roofRed) | 2 | G, R | `styles.ts` `appearanceForTown` (lines 537–577) swaps roof colour and sets `ridgeOffset`; the Hall main volume is a hip, and a hip ignores `ridgeOffset` (44 hip volumes carry one). The hip east plane is a triangle by construction (`paintRoof`) | Medium | inferred | Make the hall roof read as a hip (ridge line, lit plane), or keep the original red | None |
| SI-6 | Town Hall (0) clock faces | The two clock discs straddle the eave and overlap the roof edge | 2 | G, R | `painter.ts` `case 'clock'` (line 622) draws the disc at `H − 7` after all roofs, so it is painted over the eave overhang | Medium | visual + source | Place discs lower or paint before the roof | None |
| SI-7 | Dormers (AR-1) | Grey or cream boxes sit on the roof edge and on gable ends; one on Multi (81) hangs at the eave | 2 | G | `painter.ts` `case 'dormer'` (line 768) uses `volumes[0]` only and the roof height at an eave point, with no roof of its own. For a gable with ridge along y, that edge is the end triangle, not a plane | Medium | visual + source | Same fix as AR-1, plus choose a spot on a real roof plane and use the volume that owns it | None |
| SI-8 | Multi-volume buildings (15: Town Hall, Signal Lab, NW Tower, Windmill, 2 farms, 7 cottages and family houses, Large, Plaza Inn) | Wings and bays are separate gables and hips drawn over each other; there is no valley, no hip-to-gable junction and no height check | 2, 5 | G | `styles.ts` lines 104, 154–155, 217: the wing starts at `split − 0.2` or `back − 0.1`, so volumes overlap by design, but `painter.ts` paints each volume's roof as its own solid. A wing ridge can rise above the main roof eave with no intersection line | High | source (all 15); visual (Town Hall in 2; Wharf Warehouse in 5 is inferred) | Add a simple junction rule: stop the wing ridge below the main ridge, or draw a valley line where the planes meet. Inside the existing painter | None |
| SI-9 | Buildings with touching footprints: 31 non-castle pairs (13 more in the castle) | Roofs meet with no valley and no shared wall: gable end against hip (Mill 19 and Miller's Cottage 20), gable against gable (Fish Market 29 and Boathouse 30; Net Loft 31 and Wharf Warehouse 90), hall against gable (0/81, 42/81) | 1, 2, 4, 5 | D, G | `layout.json`: 44 edge-touching pairs of 98 buildings, no gaps. **Which pairs are meant to be terraces is not recorded anywhere.** The `row` kind (6) is plausibly terraced; cottage and family pairs are not obviously so. `readBuildings` does not check adjacency | High | visual (1, 4, 5); source (list) | First classify the pairs as intentional or not (owner decision S13). For intentional ones draw a shared party wall and matching ridges. For the rest prefer a painter fix; a footprint change needs approval | **Possible** if the owner chooses to separate pairs |
| SI-10 | Roof overhang on touching sides | Roofs extend 0.12 tile past the wall on all sides, so they reach into the neighbour at every touching edge | 4, 5 | G | `painter.ts` line 22 `OVERHANG = 0.12`, applied equally on every edge | Medium | source | Zero the overhang on a side that touches another building | None |
| SI-11 | Gable ends on dark buildings (Fish Market 29 and others) | The end triangle is flat wall colour with no verge board, so on a dark timber wall it reads as a second roof sheet or a missing roof edge | 4 | G | `painter.ts` gable branches in `paintRoof`: triangle uses the wall's lit or shade tone | Medium | visual + source | Add a verge edge in the roof tone; check with AR-2 | None |
| SI-12 | Mill (19) waterwheel | The wheel hangs on the east wall over dry grass while the water is on the west and north; the one visible face cannot face the river | 1 | E, G | `styles.ts` mill style `wheel` extra and `painter.ts` `case 'wheel'` (line 739) are fixed to the east face. Water tiles near the mill are at x ≤ 65; the mill is at x 66–69 (script). Existing AR-9 | Medium | visual + source | AR-9 decision: omit the wheel, move it, or add a painted millrace | **No change to the mill position**; wheel placement only |
| SI-13 | Castle wall ends against towers | Round towers do not meet the square wall ends. The gap between the wall's end and the drum surface is **0.22 to 0.72 tile at 11 of the junctions** (for example Curtain N1/NW Tower 0.59, Curtain E/NE tower 0.72, Curtain E/SE tower 0.69, North Tower 0.22) | 3 | G | `castle.ts` towers are cylinders (radius at most 1.3) centred in a 2–3 tile footprint. The wall box ends at the footprint tile edge and is 0.48 tile thick, so the drum curves away from it. Computed analytically for the wall centre-line; not measured in pixels | High | source; inferred visually (the supplied screenshot 3 shows only part of the wall) | Extend each wall end to the tower axis, or add a short stone return. Do not move towers | None |
| SI-14 | Free wall ends in the inner ward | Inner W, Inner E, Inner S1 and S2 end without a tower or cap; the open ends show a raw box edge | 3 | G | `castle.ts` `paintWallTile` has no end cap; `walls` data has 6 free ends. The curtain's south gap at x = 12 is intentional (§13.2) | Medium | source; open (visual) | Add a cap or a return at free ends | None |
| SI-15 | Keep crown (7) | Large flat pale slabs show around the recessed upper storey. They read as exposed wall tops, not as a deliberate roof terrace | 3 | G | `paintKeep`: the upper storey is recessed and the crown at body height is a flat top. Whether this is the intended terrace is not stated in the code | Medium | visual; open (intent) | Decide intent. If a terrace, add parapet and floor detail; if not, a roof | None |
| SI-16 | South gate group: gatehouses 13 and 14, barbican towers 97 and 98, SE tower 12, Storehouse 102 | Six structures crowd together; 102 touches 13, 14 and 12 and is painted over 13 and 97. The storehouse door at (28, 12) opens onto the gate passage | — | D, R | Footprints in `layout.json`; order from SI-3 | Medium | render (not in the supplied shots); open | Fix SI-3 first, then judge whether the group still reads as a gate | **Possible** (footprints) |
| SI-17 | Great Hall (8) and NE Tower (10) | The hall is painted over the tower it touches | — | R | SI-3: hall anchor key 38, tower key 37 | Medium | source; open (visual) | SI-3 | None |
| SI-18 | Windmill (18) beside Miller's Cottage (20), Weir Cottage (21) and Ferryman's hut (22) | The windmill's base is within 1 tile of all three; roofs overlap its sails and tower at mid zoom | 1 | D, G | `layout.json` footprints; windmill has two volumes | Medium | visual; inferred cause | Judge after SI-3 and SI-9. No move assumed | **Possible** |
| SI-19 | Building grounding (all) | In 5 the dark walls meet the ground with only a thin grey line, no step or contact shade | 5 | G, E | Plinths exist only for some styles in `Appearance`; no contact shadow for walls on grass | Low | visual; open (which styles) | Plinth and contact shade through existing parameters; overlaps AR-4 | None |
| SI-20 | Validation gap | Nothing in the tests or in the data reader detects SI-1 to SI-18 | — | — | Existing tests cover non-overlap, dry land, one level, volumes inside footprints and roof above walls. None covers touching pairs, painter order, roof junctions or castle connectivity | High | source | Add guards (see VQ0) | None |

## 13.4 Mapping to the five screenshots

| Shot | Subject | Issues |
|---|---|---|
| 1 | Water Mill (19), Miller's Cottage (20), windmill (18) | SI-9, SI-12, SI-18 |
| 2 | Town Hall (0), Multi (81), Clinic (42) | SI-3, SI-4, SI-5, SI-6, SI-7, SI-8, SI-9 |
| 3 | Keep (7), Keep Gate Tower W (99), walls | SI-1, SI-2, SI-3, SI-13, SI-14, SI-15 |
| 4 | Fish Market (29), Boathouse (30), Tavern (91) | SI-9, SI-10, SI-11 |
| 5 | Net Loft (31), Wharf Warehouse (90) | SI-8 (inferred), SI-9, SI-10, SI-19 |

Not shown in any supplied screenshot: SI-16, SI-17 and SI-20.

## 13.5 Repeated and isolated defects

| Kind | Issues | Reach |
|---|---|---|
| **Repeated across the town** | SI-3 (7 pairs), SI-8 (15 buildings), SI-9 and SI-10 (44 touching pairs), SI-13 (11 junctions), SI-11, SI-19 | The same cause appears in many places, so the fix belongs in the shared painter or key, not in a per-building patch |
| **Isolated** | SI-1 (keep), SI-5 and SI-6 (Town Hall), SI-12 (mill), SI-15 (keep crown), SI-16 (south gate), SI-18 (windmill) | One building or group each |

## 13.6 Relationship to existing IDs

| Existing | Relationship |
|---|---|
| AR-1 dormer boxes | SI-7 adds the structural cause (placement on the wrong plane). Keep one fix |
| AR-2 dark roofs, AR-6 flat roof planes | SI-11 and SI-5 are adjacent but distinct: they concern shape and junction, not value range |
| AR-9 waterwheel | SI-12 is the same defect; confidence is now **source-confirmed** (water west, wheel east). Decision unchanged |
| CA-1 tower masonry | Unrelated to SI-13: CA-1 is course texture, SI-13 is whether the drum meets the wall |
| CA-3 bailey lattice, TE-6 ghost patches | Not explained by any SI item |
| **New** | SI-1 to SI-4, SI-6, SI-8 to SI-11, SI-13 to SI-20 |

## 13.7 Counts

20 issues (SI-1 to SI-20), tallied from the register in §13.3.

| Severity | Count | IDs |
|---|---|---|
| Critical | 1 | SI-1 |
| High | 7 | SI-2, SI-3, SI-4, SI-8, SI-9, SI-13, SI-20 |
| Medium | 11 | SI-5, SI-6, SI-7, SI-10, SI-11, SI-12, SI-14, SI-15, SI-16, SI-17, SI-18 |
| Low | 1 | SI-19 |

Primary cause class: rendering 5 (SI-1, 2, 3, 4, 17), geometry 10 (SI-5, 6, 7, 8, 10, 11, 13, 14, 15, 19), data or placement 3 (SI-9, 16, 18), environment 1 (SI-12), none 1 (SI-20, a test gap).

## 13.8 Issues that still need inspection

- **SI-3** pairs other than 0/81 and 7/99, and **SI-17**: render each pair at close zoom and compare with the expected order.
- **SI-8** on the 15 multi-volume buildings: only the Town Hall is directly seen; check each for a ridge above the main roof.
- **SI-9**: classify each of the 44 touching pairs as terrace or accident.
- **SI-13** and **SI-14**: measure the gap in pixels on a close render, not only analytically.
- **SI-15**: confirm the intent of the keep crown.
- **SI-16 and SI-18**: not in a supplied screenshot.
- Pairs with touching **castle** footprints (13) were checked for order only, not for roof junctions.

---

# Appendix A — Effect classification (R6)

| Effect | Cache (baked) | Overlay (animated/additive) | CSS |
|---|---|---|---|
| Shadows, rim light, haze, wet/snow tones, lit-window fills, lamp pools, spill wedges | ✔ | | |
| Window/lamp halos and flicker, torches flame flicker, chimney embers | | ✔ | |
| Smoke, flags, banners, signs, awnings, laundry | | ✔ | |
| Clouds and cloud shadows | | ✔ | |
| Stars, moon, sky gradient | | | ✔ |
| Water glints/flow/foam/mist, boats, ducks | | ✔ | |
| Agents, animals, wildlife | | ✔ (with cached occluder masks) | |
| Meadow life layer, canopy glints, leaves, petals | | ✔ | |
| Rain, snow, mist, breath | | ✔ | |

# Appendix B — Reserved and observed hash indices

Observed in files read (non-exhaustive; grep before using any index): `50, 51, 60–63, 80, 247–250, 271, 272, 419, 731–736, 902, 910–918, 939–943, 950–953, 960–963`. **Reserve 970–999 for new ambient hashes** and never reorder or reuse existing ones (v3 rule 0.3.4).

# Appendix C — Files audited (read-only)

Revision 3 additionally read `data/layout.json` (buildings, walls, roads, heights, water, yards), `buildings/scene.ts`, `render/depth.ts`, `buildings/painter.ts` (roofs, extras), `buildings/styles.ts` (volumes, neighbour pass), `buildings/castle.ts` (keep, walls, towers), `buildings/buildings.test.ts` and `data/buildings.test.ts`.

`src/client/world/themes.ts`, `activeTheme.ts`, `TownCanvas.tsx`, `ambient/*` (`ambientScene`, `ambientPainter`, `ambientLod`, `animationPolicy`, `animationScheduler`, `useAmbientMotion`, `waterEffects`), `buildings/palette.ts`, `buildings/scene.ts`, `buildings/painter.ts` (anchors, lit windows, wet/snow), `buildings/castle.ts` (torches, banners), `decor/plan.ts`, `decor/layer.ts`, `decor/plants.ts`, `decor/props.ts`, `data/decor.ts`, `data/layout.json` (counts), `render/waterPainter.ts`, `render/cacheResolution.ts`, `render/worldTransform.ts`, `render/viewTransform.ts`, `styles.css`, `docs/decisions.md` (ADR-021–025), `docs/Maynes-World-Art-Direction-v3.md`. Revision 2 additionally read the relevant parts of `buildings/castle.ts`, `buildings/styles.ts`, `buildings/painter.ts` (extras), `render/roadPainter.ts`, `render/terrainPainter.ts`, `render/terrainPalette.ts` and `decor/plants.ts`, and rendered the app from a scratch harness outside the repository. Files not read in detail: castle and cathedral geometry beyond the code cited in §11, sprite and backdrop legacy code (`art/*`, `scenes/MeadowScene.tsx`, not used by the town canvas).
