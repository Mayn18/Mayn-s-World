# Mayn's World — Consolidated Art Direction, Theme Architecture and Copilot Implementation Specification (v3)

**Supersedes v2.** Basis: the four original screenshots, the v1 audit and the **Milestone 0 (M0) audit** of the renderer and cache files (branch `feat/town-world-redesign` at baae9e6; read-only; no browser, no build, no tests were run). Facts are tagged **[M]** measured from code or data, **[E]** estimate, **[?]** unknown. Visual numbers remain **starting values to tune**.

**What v3 changes:** the v2 object/ground/themed-composite cache (`O`, `G`, `T`) is **dropped** because M0 showed it is unsafe for depth. Part D and Milestone M1 are rewritten around the renderer that actually exists. The art direction, the six planned themes and the visual milestones M2 to M8 are otherwise unchanged, except where a reference depended on the removed architecture. **Appendix 5 lists every such change.**

**Guiding principle:** *Build the world once. Change its atmosphere through themes. Animate its life independently.*

**Units:** `lp` = logical (pre-upscale) pixel, assuming a tile roughly 32 lp wide. Measure the real tile size first and scale proportionally.

## How to use this document

- **You** read all of it.
- **Copilot** needs only: **Part 0**, the **Part E** subsections a milestone names, that milestone in **Part F**, and the **Part G** items it names. Appendix 1 records the M0 findings that Part D is built on; Copilot reads it only if Part D seems to contradict the code. Paste the prompt in Appendix 2 for each milestone. Do not paste the whole file each time; that wastes allowance.

---

# PART 0 — Ground rules for Copilot (read first, applies to every milestone)

## 0.1 Preserve exactly
World layout, building positions and footprints, terrain and elevation, road and water masks, district boundaries, destination positions, camera pan and zoom, navigation and interaction behaviour, the Canvas 2D renderer, the existing depth sorting and occlusion, the adaptive-resolution cache mechanism (extend it; do not replace it), the flattened cache and its far-to-near, tile-by-tile painting order, the position of the existing shadow pipeline in that order, the CSS sky, and procedural tree placement (the existing `hash2` inputs and the placement rules in `decor/plan.ts`). Any structural change is listed in Appendix 3 and **requires approval**. If a task seems to need one, stop and report.

## 0.2 Allowance discipline
- Inspect the architecture **once** (Milestone 0). Reuse what exists. Use targeted search, not repo-wide audits.
- Implement the **smallest change** that meets the milestone's acceptance criteria. Do not rewrite working systems.
- No speculative abstractions. A new abstraction is allowed only if this document names it **or** it has at least two consumers inside the current milestone.
- No new documentation files. Report in chat only, in 15 lines or fewer (format in 0.6).
- **Dev-only instrumentation** (timing, parity checksum, dev test theme) is allowed only where a milestone names it. It is guarded by `import.meta.env.DEV` (or the project's equivalent), must not exist in the production bundle (verify), and is removed or left inert as the milestone states.
- Screenshots: at most three per milestone (full aerial, one mid-zoom, one close-up), same camera positions as the baseline, only when the milestone is visual.
- Run existing tests, typecheck, lint and production build **once, at milestone completion**. Do not re-run them after every edit.
- **Never commit, push, merge, create or switch branches without explicit permission.**
- **Stop at the end of the milestone.** Do not begin the next one without human approval.

## 0.3 Architecture rules (non-negotiable)
1. **Painters never read the active theme or import the theme module.** They receive derived palettes and render parameters as arguments, exactly as they receive `buildingPalette` and `terrainPalette` today. A new theme field reaches pixels only by being added to a derivation function and passed in. Enforce with an import restriction or a simple grep check.
2. **Depth-dependent effects are painted in sequence.** Anything that interacts with occlusion or depth (cast and contact shadows, lit-window fills, wet or snowy surfaces, ground light pools) is painted into the flattened cache at its tile's slot in the existing far-to-near order. No whole-world pass is composited over the finished cache if it can overlap objects at different depths.
3. **What may be applied to the finished cache or drawn over it:** (a) uniform final passes at build time (a haze gradient; grade only if palette derivation proves insufficient) that have no depth dependence, and only once a milestone has justified them; (b) overlay-canvas content that is animated, additive or screen-space (D4, D7).
4. **Determinism:** all variation is a pure function of `(seed, entityId, world coordinates)`. No `Math.random()` in painters. **No random per-pixel noise** (ADR-024). Existing hash indices keep their meaning; new variation uses new indices and never reuses or reorders existing ones.
5. **No pixel readback** (`getImageData`) in per-frame code. The only exception is the dev-only parity checksum in M1 (build-time, development builds only).
6. No new dependencies, no workers, no WebGL. Standard Canvas 2D.
7. **Animated content is never baked into the cache.** Theme-dependent static content is baked and rebuilt on theme change.
8. Originality: no copied sprites, textures or code from reference games or repositories.
9. Accessibility and DOM navigation are untouched. Destination labels and hotspots must stay unobstructed.
10. **Colour and texture conventions come from the existing project rules** (`CLAUDE.md`, ADR-024, `themes.ts`). v2 proposals that may conflict with them are tracked in Part H and are not implemented until you resolve them.

## 0.4 Stop and ask if
- The renderer contradicts an assumption in Part D (see Appendix 1, the M0 findings).
- A milestone seems to require changing world data or a structural item.
- A measured budget in Part G cannot be met.

## 0.5 Free-allowance prompt template
See Appendix 2.

## 0.6 Report format (≤ 15 lines)
What changed (files/systems), what was tested and results, measurements (cache bytes, rebuild times), what was **not** tested, open questions.

---

# PART A — REVISED VISUAL AUDIT (retained and condensed)

## A1. Verdict
The town is **not ugly**. Palette discipline, pixel grid and layout are good. It looks *unfinished*. About 80% of the gap to a professional town-builder is in the **finishing layer** (light, shadow, material, variation, atmosphere), about 20% in geometry. The bones stay.

| Impression | Verdict |
|---|---|
| Basic / ugly | Disagree with "ugly". Agree it is unfinished. |
| Repetitive | **Strongly agree.** Biggest problem. |
| Flat | Agree. Mostly lighting, not geometry. |
| No atmosphere | Agree. |
| Generic | Partly. Layout has identity, surfaces do not. |
| Less polished than pro games | Agree, but the gap is narrow. |

## A2. Seven root causes
1. **No consistent light model**, so faces are not described by shading.
2. **No cast or contact shadows.** Objects float.
3. **Collapsed value structure:** plaster, roads, plazas and the castle lawn share one pale range, so figure and ground merge.
4. **Fills, not materials:** castle stone is a single flat lavender-grey with evenly spaced ring lines; roofs are flat colour plus hatch; grass is two flats.
5. **Template buildings:** one box-plus-roof template, hue-swapped; evenly gridded pale-blue windows; identical chimneys and garden beds.
6. **Scatter, not ecology:** near-identical conifers, lollipop deciduous trees, even spacing, isolated orange dots.
7. **No finishing pass:** flat sky, no haze or grade, plain brown base slab.

## A3. Per-category findings (retained)
- **Buildings:** flat facades, no jetties, oriels, porches or shutters; roofs differ in colour not material; rectangle-plus-triangle skyline; garden beds stamped.
- **Castle:** strongest silhouette but generated-looking. Ring-banded cylinders, no batter, corbelling, machicolation or hoarding; two-colour cones scattered evenly; endless identical walls; no unmistakable donjon; empty lawn courtyard.
- **Cathedral:** right idea (twin towers, long nave) but the nave is too low and flat-roofed, spires are plain pyramids, glass detail too small and low contrast, and it uses the same grey as the castle.
- **Vegetation:** one conifer silhouette; round deciduous balls; no clearings, edges or drifts.
- **Terrain:** one beige for all roads; stepped voxel-like water edges, single flat blue; flat grey cliffs; placeholder brown base.
- **Light and atmosphere:** no readable sun, no shadows, no haze.
- **Composition:** good landmark triangle (castle, church, plaza), but a uniform mid-ground, forest competing with the castle, weak district identity, roads and houses collapsing into one beige at aerial zoom.

---

# PART B — DEFINITIVE ART DIRECTION

## B1. Direction
**Golden-Hour Medieval Diorama: detailed isometric pixel art with painterly value grouping.** Stay in pixel art and Canvas 2D.

**Clarification that changes v1:** golden hour is **not the baked lighting**. It is the *quality* of the finish (warm light, cool shadow, rich materials, clear hierarchy), and it is realised in a specific theme (Sunset Dream). The **reference art is authored in neutral daylight**; every other theme is derived from it through theme-specific palettes and render parameters, and a theme switch rebuilds the flattened cache (Part D). **Daytime Meadow is the reference condition** against which every other theme is a transformation.

## B2. Pillars
1. **One light model, theme-parameterised.** Form shading is fixed; light colour, strength, shadow length and ambient change per theme.
2. **Materials, not fills.** Each has a ramp, a texture rule and an ageing rule, and stays recognisable under every theme.
3. **Silhouette first.** Every building family and tree species is identifiable as a black shape.
4. **Landmarks sing, mid-ground hums, background rests.**
5. **Controlled irregularity**, seeded, replaces repetition.

## B3. The fixed lighting convention (applies to all themes)
- **Key light always comes from the screen-left hemisphere.** Left-visible faces are lit more than right-visible faces in every theme. Top faces are brightest.
- Themes may change **elevation (10–65°), colour and intensity**, but may not flip faces. Azimuth variation (±30° in v2) is **deferred**: the existing baked shadows fall in one fixed direction (east), and whether they can express another is an M2 finding.
- Shadows therefore always fall to the right and toward the viewer. Only their **length, colour, opacity and softness** change.
- **Form shading is baked** into object art as neutral daylight tone ramps (5 steps in the v2 target; Part H2 says how this maps onto the existing 4-tone convention). It is the *shape* of light, not the *mood*.
- Diffuse themes (Rainy Evening) have no strong key light. They compress contrast and fade shadows through the theme's derived palette and shadow parameters, applied by the cache rebuild.

## B4. Palette: daylight-reference ramps
5 steps per material (highlight / light / base / shade / deep). **Highlights shift only about 6–8° warm; shades shift about 15–20° toward blue-violet.** No pure black or white. This is milder than v1 because the theme derivation, not the reference art, supplies theme warmth.

**Convention note (decision 8):** these hex values are **design targets**, not a new colour module. Colours stay defined in `themes.ts` and tones are derived by the existing `mix` convention. Where a 5-step ramp cannot be reproduced that way, that is a Part H2 item, not a silent override.

| Material | Highlight | Light | Base | Shade | Deep |
|---|---|---|---|---|---|
| Lime plaster | `#f4ecd8` | `#e6d9b8` | `#d0bf98` | `#9a93a0` | `#6f6c88` |
| Castle granite | `#cdc8be` | `#b8b3aa` | `#a39e9a` | `#7d7a8a` | `#58566e` |
| Cathedral limestone | `#f0e6cc` | `#e1d2ac` | `#cbb994` | `#a2949f` | `#76708a` |
| Slate | `#8c97b3` | `#6f7a95` | `#4f5873` | `#363d57` | `#262b40` |
| Terracotta | `#e69463` | `#d37244` | `#b45c3c` | `#8f4638` | `#5f2f33` |
| Oak / shingle | `#8b6a4f` | `#76594a` | `#6b4e3d` | `#473431` | `#2e2428` |
| Thatch | `#e2c677` | `#d3b668` | `#b8964f` | `#8a6e45` | `#5c4a3a` |
| Verdigris | `#9bd6bb` | `#7fc4a8` | `#4f9a82` | `#35705f` | `#244c4a` |
| Meadow grass | `#aed46f` | `#97cb62` | `#6fae4a` | `#4a8a4a` | `#2f6a50` |
| Conifer | `#4f9a62` | `#3a7d58` | `#2a6150` | `#1d4a3c` | `#153a35` |
| Water (neutral) | `#a9e3e0` | `#8fd6d8` | `#5db3d0` | `#3b86b8` | `#2a5f94` |

Master palette budget: about 56–72 colours. Cap roof saturation 15–20% below the current flat colours (except verdigris and heraldic accents).

**Colour semantics:** power = cool dark granite and slate with red and gold; sacred = pale warm limestone with saturated glass; commerce = terracotta and striped awnings; craft/riverside = weathered oak and rust brick; rural = thatch and grey-brown timber.

## B5. Pixel scale, outlines, dithering
- One integer pixel grid, 2:1 isometric. Snap sprites to integer lp. `imageSmoothingEnabled = false`. Verify and remove any edge softness seen at some zooms.
- Detail budget: landmarks high, houses medium (one or two signature details each), forest and distance low (shape and value only).
- **Selective outlining** on trees and props: darker hue-shifted edge on the shaded and ground side, light rim on the lit side. No uniform dark outline.
- Dithering only as 1-lp checker on large gradients. Never as wall texture.

## B6. Architectural language
Late-medieval Rhenish/Flemish towns with storybook proportions: steep roofs, tall chimneys, jettied upper floors, stepped gables, corner turrets, slightly wonky ridgelines. Six residential families and three civic types (Part E2).

## B7. Materials
- **Plaster:** lime wash with ±1-step tonal patches, stains under sills and eaves, lighter quoins.
- **Timber:** dark oak with 1-lp grain dashes, thicker ground-floor members.
- **Stone:** irregular coursing with dressed corners and surrounds.
- **Roofs:** each material has its own course language (tile rows offset, staggered slate with lighter replacements, scalloped shingle, clumped thatch with rolled ridge). Optional seeded moss on shaded slopes.
- **Ground:** authored tile variants chosen per tile by hash, plus a tile-aligned macro tint driven by world data, with no noise function (Part E6; subject to Part H1).

## B8. Hierarchy
Contrast budget: landmarks highest, mid-ground medium, forest lowest and cooler. District roof-colour biases (Part E9).

---

# PART C — THEME ARCHITECTURE

## C1. Three systems

| System | Contents | Changes when | Lives in |
|---|---|---|---|
| **A. World content** | Building, wall and tower geometry and art; tree and plant art; terrain, road and water geometry; props; all coordinates and placement | Only on code change | The existing painters and the flattened cache, from world data |
| **B. Theme rendering** | Sky, key-light colour and elevation, ambient, grade, shadow colour/length/opacity, haze, water look, lit-window fills, wet or snow surface states, weather type | Theme switch | CSS variables (sky); derived palettes and render parameters consumed by the existing painters; the cache rebuild; optional uniform final passes (Part D) |
| **C. Dynamic animation** | Water motion, smoke, flags, rain, snow, fireflies, NPCs, animals, clouds, lamp flicker, foliage shimmer | Time | Overlay canvas, later milestones (Part D) |

**Asset-to-system mapping**

| Asset | System | Notes |
|---|---|---|
| House, tower, wall, cathedral | A | Form-shaded neutral art. Windows drawn as day glass in Daytime Meadow |
| Window rectangles, lamp points, roof planes, chimney tops, flag poles | A (local to each painter) | Kept as local values so a theme variant of the same painter can change them. Positions go into a small registry **only when its first consumer exists** (A2 smoke and flags, A5 glow), not before |
| Trees and plants | A | Pre-baked species and size sprite variants |
| Road, plaza, grass, field, riverbank | A | Ground painter, tile-variant based; its cost is part of every cache rebuild |
| Water surface base | A (neutral) + B (tint, reflection, baked from the terrain palette) + C (motion) | Mask from world data |
| Sky, vignette | B | Theme-driven CSS background, not world art. The sky is already CSS (M0) |
| Shadows | A + B | Baked in sequence by the existing shadow code; colour, opacity, length and softness come from theme parameters |
| Lit-window fills, lamp and fire ground pools | B (baked) | Painted in sequence from theme-derived palettes; which windows are lit is chosen by seeded hash at paint time |
| Window halos, glow flicker | B/C (overlay) | Overlay canvas, positions from the registry (A5) |
| Wet roads, puddles, snow caps, frost | B (baked) | Painted by the ground, roof and tree painters from theme-derived tones; rebuild on switch |
| Chimney smoke, flags, banners, NPCs, rain, snow, fireflies, clouds | C | Never in the cache |

## C2. Theme definition (data, not code)
Names illustrative. Adapt to repository conventions. One typed object per theme.

| Field | Contents | Mechanism |
|---|---|---|
| `sky` | top and horizon colours, optional stars flag | Parameter → CSS background variables |
| `key` | kind (`sun`/`moon`/`diffuse`/`filtered`), elevation (10–65°), colour, intensity; azimuth offset deferred (B3) | Parameter → shadow parameters and palette derivation |
| `shadow` | colour, opacity, length scale (clamped), edge steps (1–2) | Parameter → existing baked shadow code (colour, opacity, clamped length, edge steps) |
| `ambient` | tint colour, multiply strength, floor colour | Parameter → palette derivation (default); optional final pass later |
| `grade` | contrast, saturation, brightness | Parameter → palette derivation (default); optional final pass later |
| `haze` | colour, strength, vertical bias | Parameter → final build pass on the finished cache |
| `vignette` | strength, colour | Parameter → CSS overlay |
| `water` | tint, reflection top and bottom colours, strength, `frozen` flag | Parameter → terrain palette (baked) |
| `emissive` | window colour, fraction of windows lit, lamp colour, lamp radius, ground-pool strength | Parameter → lit fills and pools baked (T2); halos on the overlay (A5) |
| `surface` | wetness 0–1, snow cover 0–1 | Parameter → wet and snow tones painted by the existing painters (baked) |
| `accents` | glow-point style (Enchanted Forest) | Deferred |
| `weather`, `life` | type, density, ambient animation presets | Deferred to animation track |

**Where new code is needed.** A theme switch rebuilds the cache and painters already take derived palettes, so most theme values are parameters in derivation functions. Dedicated code is needed only for:
1. **Shadow parameterisation** (colour, opacity, length clamp, edge steps) inside the **existing** baked shadow code. Incremental, M2.
2. **Surface states** (wet, snow): tone variants and caps painted by the existing ground, roof and tree painters (T3, T4).
3. **Lit-window fills and ground pools**, baked (T2). Soft halos and flicker belong to the overlay (A5).
4. **Optional uniform final passes** at the end of the cache build (haze first; grade only if palette derivation proves insufficient).
5. Water is palette-driven (terrain palette); there is no separate water pass.

**Per-material recolouring is available by construction.** A theme derives its own palettes and the cache is rebuilt, so foliage-only hue shifts (Enchanted Forest, evergreen snow trees) need no special mechanism. The v2 "re-bake escape hatch" is withdrawn.

## C3. The six themes (refined, starting values)

| Theme | Sky | Key light | Shadows | Ambient and grade | Surface and emissive | Haze and water | Deferred (animation) |
|---|---|---|---|---|---|---|---|
| **Daytime Meadow** (reference) | `#8fc8ee`→`#dff0fb` | Sun, elev 50°, `#fff4dc`, 1.0 | `#3a3d6a` @ 0.34, length ≈ 0.85×height | **Identity** (no grade) | Dry. No emissive | Haze 0.05, upper bias. Water neutral | Smoke, flags, water, villagers, clouds |
| **Cozy Night** | `#0e1530`→`#25335e`, stars | Moon, elev 45°, `#9fb4e8`, 0.25 | `#0a0f28` @ 0.35, ≈ 1.0× | Multiply `#4a5a9a` 0.85, **floor** `#141c3c`, saturation 0.8 | ~60% windows lit warm `#ffc46b`; lamps and fires with ground pools | Haze `#1c2750` 0.10. Water dark with moon glints | Lamp flicker, fire, fireflies (few), night birds |
| **Rainy Evening** | `#6d7b8c`→`#a3adb8` | Diffuse, no direction | `#2a3140` @ 0.10, soft | Multiply `#8c98a8` 0.6, contrast −25%, saturation 0.65 | Wetness 0.8: roads darker, sheen, puddles; a few lit windows | Haze `#9aa5b0` 0.18. Water flat grey-blue | Rain, ripples, wet sparkle, smoke low |
| **Sunset Dream** | `#3b2a6e`→`#d9638c`→`#ffb066` | Sun, elev 14°, `#ffb27a`, 1.1 | `#3b2060` @ 0.45, length clamp ≈ 3.5×, tail fades | Multiply `#ffc9a0` 0.4 + violet in shade | Dry. Some warm windows | Haze `#f0a0a0` 0.12. Water warm reflection `#ff9a62` | Clouds, long smoke, birds |
| **Enchanted Forest** | `#0f3d44`→`#2e7d6e` | Filtered, elev 40°, `#b8ffd9`, 0.6 | `#0a2a33` @ 0.40 | Multiply `#6fc2a8` 0.5, teal overlay, saturation 1.1 | Cool windows; glow accents at anchors | Haze teal 0.15, lower bias. Water teal | Fireflies, drifting motes, glow pulse |
| **Snowy Cabin** | `#b9c9dc`→`#eef3f8` | Sun, elev 25°, `#e8f0ff`, 0.7 | `#5a6fa0` @ 0.30 | Multiply `#cfdcf0` 0.35, saturation 0.8 | Snow 0.9 on roof planes, ground, tree tops. Warm windows. Frozen water | Haze `#e8eff7` 0.14 | Snowfall, chimney smoke, breath-like puffs |

## C4. Guardrails: the same stone stays stone
- Grade bounds: saturation ≥ 0.6, relative contrast ≥ 0.7, floor luminance ≥ about 12%.
- Mortar lines and block-tone variation must remain visible in every theme (check one wall crop in each theme).
- Left-lit versus right-shaded face order must hold in every theme.
- Roof material identity (slate versus tile versus thatch) must remain readable at mid zoom in every theme.

## C5. Theme switching
Swap the active theme (active-theme state, M1) → the cache invalidates and rebuilds: the 1× tier synchronously, then the high-resolution tier in sliced frames, exactly as on first load (D5) → update the CSS sky variables → persist the preference using the project's existing preference convention. **Painters run again** (decision 5: correctness over avoiding rebuilds). The rebuild is what keeps depth, occlusion, shadows, surface states and per-material recolouring correct for every theme. Only one theme's cache is held at a time.

**Transition:** instant swap in M1 and M2. Any fade is decided in T1 and must not require a second full-size cache (a CSS opacity dip around the synchronous rebuild is the memory-neutral option). Reduced motion = instant.

---

# PART D — RENDERING AND CACHE ARCHITECTURE

## D1. Recommendation in one paragraph
Keep the renderer that exists: **one flattened, depth-aware cache** painted tile by tile from far to near; a 1× tier painted synchronously and a high-resolution tier built in 3 ms animation-frame slices (capped at 64 MiB); one nearest-neighbour `drawImage` per frame; and the CSS sky. **Themes enter through the existing palette derivation, and a theme change rebuilds the cache.** Depth-dependent effects (shadows, wet, snow, lit-window fills) are painted in sequence inside that rebuild, so occlusion stays correct by construction. Uniform effects may later be added as a final pass at the end of the build. Only additive, screen-space or animated effects go on a **separate, viewport-sized overlay canvas**, planned for A1 and **not built in M1**. No new full-size canvas and no new persistent cache is introduced.

## D2. The renderer as discovered in M0

| Aspect | Finding | Tag |
|---|---|---|
| Structure | One flattened cache. `paintTerrain` walks the tiles far to near. Per tile: cliff faces, then top or water, then roads, then `scene.paintTile` (crops and beds, baked shadow rectangles, walls, buildings at their south-east footprint tile, standing decor) | [M] |
| Tiers | 1× painted synchronously on first draw. A max-zoom tier is then built in 3 ms animation-frame slices, capped at 64 MiB, and swapped in | [M] |
| Frame | One nearest-neighbour `drawImage` per frame. `scheduleDraw` on wheel, pan and resize; no continuous loop; no `visibilitychange` handling in the canvas | [M] |
| Theme | `Theme` is a palette of hex colours in `themes.ts`; only `daytime-meadow` exists. Painters receive derived palettes (`buildingPalette`, `terrainPalette`), not the Theme. Tones come from `mix` as `{lit, shade, dark, light}`. The cache is keyed by the theme object, so a theme change forces a full synchronous 1× repaint and re-upgrade | [M] |
| Light and shadows | Light from the upper left, shadows to the east. Shadows are baked in sequence as flat 20%-opacity rectangles up to 2.6 tiles, same level only | [M] |
| Sky | CSS gradient on `.world-viewport` from `--c-sky-*`, set once in `main.tsx`. The canvas is transparent outside the world. No vignette | [M] |
| Trees | Not stored. Derived on every build in `decor/plan.ts` from `hash2(x,y,n)` plus terrain masks. Tree count not executed | [M] / [?] |
| Entities | No per-entity bitmaps; painters draw paths straight into the cache context. Only `Placement` origin and height are queryable | [M] |
| Size | Map 80×60 (4,800 tiles), tiles 32×16, level height 10 px, bounds width exactly 2,240 px, height about 1,170 px or more (terrain only) | [M] |
| Cache memory | 1× about 10.5–12 MB. At 1440×900 the 64 MiB cap binds (scale about 2.4–2.5, about 5.4–5.6k × 2.9–3.2k px, about 16M px, at the 4096² iOS limit). Peak during an upgrade about 75 MiB | [E] |
| Timing | Not measured. The only proxy is ADR-023's earlier owner measurement from before the cache: about 185k canvas calls and 136–281 ms per redraw | [?] |

## D3. Why the ground/object split was dropped, and how shadows are handled
v2 split ground from objects so a shadow pass could sit between them. M0 shows that cannot be done safely. Ground and objects are interleaved per tile, and nearer, higher ground currently covers objects behind it. In `layout.json` heights (ramps ignored), 117 of 9,460 tile edges rise toward the viewer; 14 of those lie under building footprints (for example ids 15, 20, 21, 91, 96) and 4 under props [M]. Painting "all ground, then all objects" would draw those buildings over higher terrain. Trees are unchecked [?]. The split would also need about 192 MiB at the 64 MiB tier (three full-size canvases) [E].

**Shadow rules (incremental, inside the existing pipeline):**
1. Shadows stay baked in the per-tile sequence at their current slot. There is no separate shadow pass and no shadow layer composited over the cache (it would stain facades).
2. Improvements are parameter and shape refinements of the existing code: colour and opacity from the derived palette, a clamped length scale, one or two stepped soft edges, shapes for towers and trees, and contact AO at wall bases.
3. Each improvement must (a) paint at the same point in the tile sequence as today, (b) never paint over pixels of a nearer or equal-depth object, and (c) stay on same-level ground (no shadows on cliff faces or other levels). Checked on named crops: a shadow behind a house, a shadow beside a cliff.
4. Shadows longer than 2.6 tiles, shadows crossing levels and other directions are **not assumed possible**. M2 first reads the shadow code and reports what it can express.
5. A theme with a different shadow length simply rebuilds the cache.

## D4. Which effects need a rebuild and which can be overlays
**Principle: default to the rebuild.** An effect leaves the cache only if it is uniform or additive, cannot look wrong when drawn over a nearer object, and the saving has been measured.

| # | Effect | Mechanism | On theme switch | Reason |
|---|---|---|---|---|
| 1 | Sky | Existing CSS variables | CSS update only | Already CSS |
| 2 | Palette shifts (night, overcast, sunset, teal, snow-white); the theme's **grade** by default | Theme → derivation → painters | **Rebuild** | Exact; no blend modes; no transparent-corner edge cases |
| 3 | Per-material recolouring (foliage hue and similar) | Derivation | **Rebuild** | Free by construction |
| 4 | Shadow colour, opacity, length, softness | Existing baked shadows, parameters from derivation | **Rebuild** | Shadow geometry must stay depth-correct |
| 5 | Contact AO, eave bands | Painters | Rebuild only if the tone is palette-dependent | Static form shading |
| 6 | Wetness (dark roads, sheen, puddles, slate sheen) | Ground and roof painters use wet tones | **Rebuild** | Belongs to the surface it sits on |
| 7 | Snow (roof planes, ground, tree tops) | Painters use snow tones and caps; geometry is known at paint time | **Rebuild** | Must be occluded correctly by nearer objects |
| 8 | Lit windows, lamp and fire ground pools | Lit fills painted by building and prop painters; pools on the lamp's ground tile | **Rebuild** | Depth-correct; lit or unlit chosen per window by seeded hash |
| 9 | Water tint, frozen water | Terrain palette | **Rebuild** | Palette-driven |
| 10 | Haze (vertical, world-anchored) | **Final pass** over the finished cache: one gradient fill | Part of the rebuild; no per-frame cost | World-anchored, no depth dependence |
| 11 | Global grade (multiply, floor, contrast, saturation) | Default: palette derivation (row 2). Optional later: a final pass, only if visually equivalent and measured. Blend modes over the cache's transparent corners must be verified first | Rebuild | Avoids depending on blend-mode behaviour |
| 12 | Window halos, glow flicker | Overlay canvas; positions from the registry (A5) | No rebuild | Additive, small radius, animated |
| 13 | Smoke, flags, banner cloth, clouds and cloud shadows, rain, snowfall, fireflies, water motion, NPCs, animals | Overlay canvas (A1 onward) | No rebuild | Animated; never baked |
| 14 | Hover, labels, panels | DOM | None | Existing |

**Why wet, snow and grade are not screen-space overlays:** an overlay cannot know which pixels are roof, wall or ground, and cannot be occluded by nearer objects. Wet and snow are per-surface states, so they are painted where the surface is painted.

## D5. Theme change and cache lifecycle
Sequence on a theme change (the existing theme-keyed invalidation, made explicit):
1. The active-theme state changes (M1).
2. Cancel any in-flight high-resolution upgrade. Its result must never be swapped in.
3. Release the old high-resolution tier, if held. The 1× build is synchronous inside one task, so no frame is presented in between [E; confirm in M1].
4. Paint the new 1× tier into a fresh canvas, swap it in, release the old 1×. A failed build leaves the old cache intact.
5. Schedule the high-resolution upgrade (existing 3 ms slices, 64 MiB cap).
6. Request a draw. At high zoom the new theme shows at the 1× tier, scaled nearest-neighbour, until the upgrade completes. This is the same as first load.
7. **One theme's cache at a time.** No per-theme cache retention (six themes at about 75 MiB each is not possible).

| Cache or state | Invalidated by | Not invalidated by |
|---|---|---|
| Flattened cache (1× and high tier) | Active-theme change; the existing triggers (zoom tier, size and DPR, as today); painter, palette or world-data code change | Pan, hover, animation, overlay |
| Overlay canvas (later) | Not cached. Redrawn when active; resized with the viewport and DPR | Theme change (it reads theme parameters on its next frame) |
| CSS sky | Theme change (variables only) | Everything else |

## D6. Memory and performance, realistically
- **Memory [E].** 1× about 10.5–12 MB; high tier up to 64 MiB (existing cap); peak during an upgrade about 75 MiB. **The v2 budgets of 256 MB desktop and 128 MB mobile are withdrawn**; they assumed a 192 MiB object, ground and composite set. New budget: **no new full-size offscreen canvas, no new persistent cache, one theme's cache at a time, and peak offscreen bytes (including during a theme switch) never above the pre-existing upgrade peak**, plus the viewport-sized overlay once it exists. The cap is not raised; iOS Safari's canvas ceiling is already reached at max zoom [E].
- **Overlay canvas size [E].** viewport × DPR² × 4 bytes. For 1440×900: about 5 MB at DPR 1, about 21 MB at DPR 2.
- **Rebuild time [?].** Nothing is measured. The only proxy is ADR-023's 136–281 ms for the pre-cache redraw. A theme switch costs one synchronous 1× build plus an upgrade spread over frames. **M1 measures both** (dev-only). No time budget is fixed until M1's numbers exist.
- **Decision triggers (not budgets).** If the synchronous 1× build exceeds about 150 ms on the developer's machine, or a mid-range phone shows a long visible stall, propose a sliced 1× build (needs approval; touches the cache controller, not painters). If the low-resolution interval after a switch at max zoom is objectionable, propose holding the old theme until the upgrade is ready (costs memory; needs approval).
- **Regression guards for later milestones.** Full cache rebuild (1× build plus upgrade) ≤ M1 baseline + 15% after M2 and + 25% after M3, then not growing without a note. Pan frame time ≤ baseline + 0.5 ms (browser profiler, manual).
- **Ground painting** has no separate budget; it is part of the rebuild.
- No chunking is introduced.

## D7. Animation overlay: requirements (prepared in M1, built in A1)
**Planned layering:** CSS sky (`.world-viewport`) → cache canvas (the existing visible canvas) → **overlay canvas** (later; same CSS size; `pointer-events: none`) → DOM interface.

**Requirements M1 must not violate** (M1 verifies them by reading code; nothing is built):
1. **Shared view transform.** Overlay drawing uses the same camera and viewport math as the cache `drawImage` (`render/viewTransform.ts`). It stays a pure, importable function or object, not state trapped in a component closure.
2. **Independent of the cache tier.** The overlay draws in world coordinates through the view transform and never reads the cache canvas size, scale or tier.
3. **Active-theme state is readable and subscribable outside `TownCanvas`.** The overlay will read theme parameters later.
4. **Scheduling stays on-demand and extensible.** `scheduleDraw` remains the single request path. A theme rebuild starts no free-running loop other than the existing upgrade slices.
5. **Depth and bounds stay queryable.** The depth-key function (`render/depth.ts`) and `Placement` origin and height remain accessible for actor occlusion.
6. **Input transparency.** The DOM structure leaves room for a sibling canvas above the cache canvas; `pickTile` and hover are unaffected by a `pointer-events: none` overlay.
7. **Motion and visibility hooks exist.** `useAmbientMotion` already sets `data-motion` and `data-page-hidden` and honours reduced motion. A1's `AnimationPolicy` builds on them. M1 changes nothing here.
8. **No animated content in the cache.** Nothing animated is added to any painter.

**Classes of dynamic content (retained from v2):**

| Class | Examples | Draw | Occlusion |
|---|---|---|---|
| **Above-all** | Smoke, rain, snow, fireflies, clouds, cloud shadows, banners and flags on tall structures | Overlay, after the cache | None needed |
| **Ground actors** | NPCs, animals, carts, boats | Overlay | Draw actor, then **erase where static objects are in front** using each occluder's alpha silhouette (`destination-out`), per actor, from occluders along its path precomputed from the existing depth keys |
| **Ground-level surface motion** | Water shimmer, waterfall, ripples | Overlay clipped to the water mask | Same silhouette erase for bridges, docks and objects overlapping water |

- **M0 additions.** Actor occluders include **rising terrain and cliff faces**, not only buildings and props (M0 found nearer higher ground already covers objects behind it). With no per-entity bitmaps, occluder silhouettes are produced lazily by running the existing painter for that entity into a small scratch canvas, only for occluders near actor paths. Gate at A3 and A4.
- Foliage sway is **not** planned. Use light shimmer or a drifting highlight sweep instead (no baked-tree ghosting).

## D8. Render loop and animation policy (specified now, built in A1)
- **Render on demand** (already true: `scheduleDraw` on wheel, pan and resize). A frame is also requested when a cache rebuild or upgrade finishes, or when an animation is active.
- One `AnimationPolicy`: `motionAllowed = !prefers-reduced-motion && userToggle`, `visible = !document.hidden`. **A1 adds `visibilitychange` handling to the canvas loop (it does not exist today).** When not visible, stop requesting frames. When not `motionAllowed`, draw decorative effects as **one static frame per camera change**.
- Ambient animation runs at up to 30 fps. Camera movement always renders at full rate.
- **Zoom LOD:** use camera zoom relative to the initial fit to skip actors, cap fireflies and reduce weather density. Smoke remains visible at every zoom, with matching static and animated puff size and opacity.
- Pooled particle arrays, no per-frame allocation, a per-frame dynamic budget of about 4 ms.
- With the overlay canvas, **ambient frames never rebuild or redraw the cache canvas**: clear and draw the overlay only.

## D9. Reassessment of v1 recommendations

| v1 recommendation | Verdict | Reason |
|---|---|---|
| Diagnosis (7 root causes) | **Keep** | Still correct |
| Single sun with golden-hour warmth baked in | **Modify** | Baked art is neutral daylight. Key-light hemisphere is fixed; everything else is a theme parameter |
| Hue-shifted 5-step ramps | **Keep, soften** | Milder warm shift. Theme derivation supplies theme warmth. Ramp storage follows Part H2 |
| Face shading baked into painters | **Keep** | It is form, not mood |
| Warm bounce light on shaded faces | **Remove** | Baking it makes it theme-specific |
| Flat shadow layer composited once | **Replace** | v3: keep the existing baked per-tile shadows and improve them incrementally (D3). No separate pass |
| Shadow length fixed by elevation | **Modify** | Clamp, fade tail; same-level ground only (existing behaviour) |
| Contact shadows and eave AO | **Keep** | Geometry-based, painted in the cache at the tile's slot |
| Atmosphere pass as one cached composite | **Split** | Sky is already CSS (no migration). Haze is a final build pass; grade is applied through palette derivation (D4) |
| Warm grade and vignette baked | **Remove** | Daytime is identity; other themes parameterise |
| Window glow "readiness" parameter | **Replace** | Lit-window fills baked per theme; halos on the overlay later (D4) |
| Building reflections in water | **Remove** | Expensive, low value. Use a sky-gradient reflection parameter |
| Water caustics and sparkles | **Postpone** | Animation track |
| Seven residential families | **Simplify** | Six families (cottage folded into hall-house) |
| Per-block tone variation, per-clump canopies for every tree | **Replace for trees** | Pre-baked species × size × flip sprite variants (about 30–40 sprites) drawn many times; buildings stay unique |
| Per-pixel ground noise | **Replace** | Authored tile variants plus a world-data-driven macro tint; no noise function (Part H1) |
| Tree sway | **Remove** | Replaced by shimmer overlay later |
| Autumn orange accents | **Postpone** | Remove scatter now; optionally reintroduce as deliberate groves in polish |
| District prop kits (6 districts × 6–10 props) | **Postpone and shrink** | M8, three districts first |
| Laundry lines, ivy, flower boxes | **Postpone** | Polish only |
| Seeded variation framework, masonry painter, neighbour rule | **Keep** | Core to the repetition fix |
| Destination-hotspot safety checks | **Keep** | Mandatory |

---

# PART E — REVISED VISUAL IMPLEMENTATION SPECIFICATION

Each subsection: **Target**, **Changes**, **Theme-readiness**, **Avoid**, **Success**. Part 0 applies throughout.

## E1. Global: palette, form lighting, shadow contract
- **Target:** one neutral-daylight look with a clear value order, grounded by the existing baked shadows, improved incrementally (D3).
- **Changes:**
  1. **Extend the existing palette derivation** (`themes.ts` → `buildingPalette` / `terrainPalette`) to carry the B4 material tones. Colours stay defined only in `themes.ts` (Part H2). Replace hard-coded painter colours with derived-tone lookups as each painter is touched (do not mass-rewrite untouched painters).
  2. One **form-lighting helper**: `face(material, 'top'|'left'|'right', exposure)` returning derived tones (step count per Part H2). Top = highlight→light, left = light→base, right = shade. Curved forms (tower drums, domes): 3-band soft ramp from lit to shaded side.
  3. **Figure/ground retune:** roads and plazas one step darker and more neutral than plaster base; plaster lit/shaded spread of 2–3 ramp steps; castle lawn darkened and desaturated 10–15%.
  4. Roof saturation caps (B4).
  5. **Contact AO baked in the cache, at the tile's slot in the paint order:** 2–3 lp, two stepped bands at shaded wall bases, tree trunks and prop bases; 2–3 lp eave shadow band on facades; dark reveal in windows and doors.
  6. **Shadow improvements are incremental** within the existing pipeline (D3). There is no caster registry.
- **Theme-readiness:** painters receive derived palettes and parameters only (rule 0.3.1). Windows drawn as day glass. Shadows are baked in sequence from theme parameters; no haze or grade inside painters.
- **Avoid:** theme imports in painters, ad-hoc hex values, black outlines, soft blurred shadows.
- **Success:** greyscale squint test passes (value order sky > lit roofs and plaza > ground > shaded walls > forest > shadows); adjacent landmarks differ in value; unique colour count within budget.

## E2. Buildings

**Six families** (data-driven; map onto the existing building kinds; add no new buildings):

| # | Family | Roof and massing | Walls and base | Windows | Chimney |
|---|---|---|---|---|---|
| 1 | Gabled burgher house | Street-facing gable, steep (~55°), 2–3 storeys, jettied upper floor | Timber over plaster, stone sill course | Paired casements, small gable window | Single, ridge end |
| 2 | Long hall-house (incl. stone-footed cottage variant) | Low, eaves-facing, thatch or shingle | Plaster or wattle, optional stone plinth | Few, small, irregular | Central |
| 3 | Corner merchant house | Hip roof with corner turret or oriel | Stone ground floor, timber above | Oriel bay, grouped | Tall paired |
| 4 | Stepped-gable row (Flemish) | Stepped gable, party walls | Brick or plaster, pale stone steps | Tall, narrow, vertical rhythm | Back-slope |
| 5 | Workshop | Gable with hoist beam and loading door | Open ground floor, awning | Large opening below, small above | Forge stack |
| 6 | Inn or tavern | Wide gable plus stable lean-to (inside footprint), hanging sign | Plaster, strong timber, arched door | Larger | Two stacks |

**Civic (reuse existing footprints):** town hall with clock turret and verdigris cap; granary with louvred loft; tithe barn; mill.

- **Neighbour rule:** within 3 tiles, two buildings must differ in at least **two** of: family, roof material, wall tint, ridge orientation (where the footprint allows), storey count. Enforced in the seeded selector.
- **Roofs:** per-material course language (B7), ridge cap highlight, eave shadow, 1–2 seeded patches. Remove the uniform diagonal hatch.
- **Facades:** reveals and sills, shutters on about 30% of windows, lintel and step on doors, jetty brackets (inside depth-sort bounds, ≤ 4 lp overdraw), chimney caps.
- **Heights:** storey count 2 / 2.5 / 3 within family; no more than 3 adjacent buildings sharing an eave height.
- **Yards:** three types now (kitchen rows, woodpile and shed, bare yard with well). Orchard strip and chicken run postponed.
- **Seeded variation:** ±1 ramp step on wall tint, ±1 lp chimney height, ridge-end offset, optional dormer.
- **Theme-readiness:** keep window rectangles, roof-plane polygons and chimney tops as local values inside each painter, so later themes (lit windows T2, wet T3, snow T4) can vary them in the same painter. **No registry** until its first consumer (A2 or A5).
- **Avoid:** identical roof geometry on neighbours, window grids, detail that vanishes at aerial zoom.
- **Success:** at aerial, at least five distinct house shapes are nameable; black silhouettes of 20 buildings fall into at least six shape groups; neighbour rule never violated.

## E3. Castle
- **Target:** a concentric-style seat of power with a dominant donjon, a strong gatehouse and walls with rhythm. Cool dark granite, slate-dominant roofs.
- **Changes:**
  1. **Masonry painter (shared with E4):** irregular ashlar. Course height 3–4 lp, varied; staggered joints; ~⅓ of blocks ±1 step (seeded); mortar 1 step darker, on all shaded-side courses and alternate lit-side courses; larger lighter quoins; darker damp base courses with a few moss or stain streaks. **Replaces the ring bands.**
  2. **Four tower types:** battered round drum with corbelled machicolated crown; square mural tower with crenellated top and lookout; slender slate-cone watch turret; one drum with a timber hoarding (oak ramp). Vary diameter and height ±15–25%.
  3. **Roofs:** slate-blue dominant; at most **three** terracotta cones, as deliberate accents; finials; lead flashing at cone bases.
  4. **Donjon:** tallest, widest, flat crenellated roof, corner turret, large banner. The highest-contrast element in the town.
  5. **Gatehouse:** second most detailed. Twin towers, arched passage with portcullis, heraldic shield, torch points.
  6. **Curtain walls:** ±1 course-group height variation, pilasters every 6–8 tiles, arrow slits in three forms with deep reveals, merlons with distinct lit and shaded faces, mural towers at irregular spacing.
  7. **Interior (inside existing ward):** great hall with tall traceried windows, chapel with apse and bell turret, timber-and-plaster stables and barracks, paved ward, well, cart, banner poles.
  8. **Base:** strata, ledge vegetation and talus where the plateau meets lower ground (E6).
- **Theme-readiness:** as E2 for windows, torch points, cone roof planes and flag poles. Banner cloth drawn static for now; it moves to the overlay in the animation track (A2).
- **Avoid:** ring bands, equal-height towers, equal-colour cones, tiny flags, detail that vanishes at 0.5× zoom.
- **Success:** castle silhouette and keep identifiable in black; masonry not read as a repeating pattern at close zoom; no two adjacent towers share type, height and roof colour.

## E4. Cathedral
- **Target:** a luminous landmark distinct from the castle in material and colour.
- **Changes:**
  1. Warm limestone ramp (B4).
  2. Nave ridge about 60–65% of tower height; clerestory lancet row. Transept or apse stub **only inside the existing footprint** (else structural item S3).
  3. Buttresses and flying buttresses along the nave, ≤ 0.25 tile projection.
  4. Towers in three stages (blind arcade / windows / louvred belfry); corner pinnacles; tall spires with crockets and a finial.
  5. Slate roof with lead-grey cast, crest, and a lighter band.
  6. Stained glass in saturated red, blue and amber; glass uses a **fixed daylight value**; rose window at least 8 lp across.
  7. Recessed west portal with three archivolts, steps, doors, statue niche; paved forecourt, low wall or railing, lamps.
- **Theme-readiness:** as E3. Stained-glass windows are painted so the same painter can select a lit variant at night (T2).
- **Avoid:** castle grey, 1-lp detail without value contrast, noise that destroys the silhouette.
- **Success:** lightest large mass at aerial zoom; "Gothic church" silhouette in black; glass readable on shaded faces.

## E5. Vegetation
- **Target:** a forest with mass, edges and clearings; farmed fields and hedges.
- **Changes:**
  1. **Sprite atlas:** conifers (spruce, fir, Scots pine, juniper), deciduous (oak, birch, beech, willow), fruit tree, snag. Each species × 3 size buckets × flip, with 2–3 pre-baked tints. About 30–40 sprites, drawn many times. Clump-built canopies (3–5 clumps, lit top, dark underside), visible trunks.
  2. **Placement is frozen** (decision 7). Trees stay procedural, derived in `decor/plan.ts` from `hash2(x,y,n)` and terrain masks. Existing hash indices and placement rules do not change, and no tree is added, removed or moved. **Appearance only below:** new variation uses **new** hash indices appended after the existing ones, and ground cover and other new decor read the finished tree plan and never influence it. Species chosen by zoning (conifer upslope, deciduous near water and roads, willow at the waterline, fruit on farmland, juniper in gardens). Size ±20–30%, with edge-smaller and interior-taller gradient and a few veteran trees.
  3. **Forest mass:** lower per-tree outline contrast inside forests; slightly darker, cooler interior base; sun-side rim light; dappled lighter ground patches.
  4. **Ground cover:** drifts of 3–7 (grass tufts, flowers, ferns), reeds at water, shrubs along fences, hedgerows around fields, rocks, logs and stumps. Only on unoccupied non-road non-building cells.
  5. **Orange accent trees:** remove the scatter **as an appearance change only**. If the orange dots are separate placements in `decor/plan.ts`, their cells and hash inputs stay and only their painted look changes; if removing them would change placement, stop and ask. Postponed to optional deliberate groves in M8.
- **Theme-readiness:** the species table defines canopy-top shape, so snow caps (T4) and glow (T5) are painted by the same tree painter without per-tree data. Tree shadows use the existing shadow code (D3).
- **Avoid:** even spacing, outlined balls, per-tree unique painting, saturated autumn dots, trees hiding destinations.
- **Success:** black silhouettes show at least eight tree shapes; forest edge differs from interior; squint test reads one coherent mass with a lit rim; no visible grid; the planned tree placement list is identical to the pre-M6 snapshot.

## E6. Terrain, roads, cliffs
- **Target:** layered ground, a readable street hierarchy, rock that looks like rock, a base that looks like earth. **Ground painting must stay cheap** (it is part of every cache rebuild, including theme switches).
- **Changes:**
  1. **Ground painter** uses **authored tile variants** (e.g. 8 per ground type, chosen per tile by hash using the existing deterministic conventions) plus a **tile-aligned macro tint** of 3–4 flat greens driven by world data (elevation, distance to water, district). **No noise function and no per-pixel noise** (decision 8; Part H1).
  2. **Roads:** main street and plaza = irregular cobble setts with worn centre, darker gutters and lit-top kerb stones; back lanes = packed earth with ruts; plaza = radial pattern around the fountain. Grass-to-road fringe may overdraw up to 4 lp (masks unchanged).
  3. **Cliffs and retaining walls:** three or four strata tones, diagonal fractures, moss on ledges, top grass lip, rubble talus; walls reuse the masonry painter with batter.
  4. **World base:** layered cross-section (grass lip, topsoil, subsoil, stones, roots), darkening with depth. Camera and bounds unchanged.
  5. **Fields:** distinct crop textures, fences, gates; animals clustered.
- **Theme-readiness:** roads, plazas and grass are separate ground types from world masks so the ground painter can use wet or snow tones (T3, T4). Shadows stay on same-level top surfaces (D3), so cliff faces never receive flat shadows.
- **Avoid:** straight perfect edges, 1-lp noise shimmer at zoom, ground painting that noticeably slows the cache rebuild.
- **Success:** street hierarchy legible at aerial; cliff reads as rock; base reads as earth; ground painting cost recorded and the full rebuild within the D6 regression guard.

## E7. Water
- **Target:** neutral-daylight water with depth and banks, ready for tinting, reflection and later motion.
- **Changes:**
  1. Smooth the stepped zigzag edge with rounded autotile corner pieces sampling the existing mask (mask unchanged).
  2. Depth gradient (shallow tint at banks, deeper blue-teal in the centre, 1-lp checker dither between steps).
  3. Bank dressing: wet mud strip, reeds, rocks, stone revetment near buildings.
  4. Bridges with a shadow, plank rhythm, rails. Waterfall with layered streaks and a foam base (static).
  5. **No** building reflections. **No** animated sparkle now.
- **Theme-readiness:** water tint, reflection gradient and frozen state come from the terrain palette and are baked (rebuild on switch). Waterfall-head and bridge-pier anchors are recorded when the registry exists (A3).
- **Avoid:** single flat blue, stepped edge, per-frame effects.
- **Success:** no zigzag edge at any zoom; water takes a tint and reflection gradient cleanly in the dev-only theme preview (which rebuilds the cache).

## E8. Props and environmental storytelling
- **Target:** small stories that reward zoom without cluttering aerial view.
- **Changes (M8, three districts first):** market square (varied stripes, crates, barrels, notice board), riverside (drying racks, nets, wood stacks, dock), farmstead (hay, plough, fence, trough). Place in 3–5 item purpose clusters beside relevant buildings. Hanging shop signs with simple icons. Lamp posts are painted with their light point as a local value (halos later, A5).
- **Postponed:** noble row, church quarter and castle ward kits, pedestrian palette variation, laundry lines, ivy.
- **Avoid:** even scatter, props on roads or hotspots, anything that adds constant motion.
- **Success:** at mid zoom the three districts are identifiable by props alone; no prop appears more than twice on one screen.

## E9. Composition and hierarchy
- Contrast budget (landmarks highest, forest lowest and cooler); district roof biases (market terracotta and stripes; riverside weathered oak and dark shingle; noble row slate and verdigris; farm thatch and grey-brown; church quarter slate and pale stone), 20% off-palette allowed.
- Skyline rhythm: low at the river rising through the market to church and castle.
- **Aerial LOD:** suppress sub-4 lp details automatically at far zoom so silhouette, value and shadow carry.
- **Hotspot check** after every milestone: no canopy, tower or overhang hides a destination marker. Reduce decoration, never the destination.
- **Success:** a three-second glance identifies castle, cathedral, plaza first; districts guessable from colour and props.

---

# PART F — REVISED MILESTONES

Every milestone stops for human approval. Common exclusions for all: no commits or pushes, no new docs, no world-data changes, no theme selector UI before T1, no animation before A1.

**Order rationale.** I moved **Daytime lighting and value structure (M2) ahead of architectural variety**, because they are the biggest visual gain, they define the reference every later sprite is judged against, and later painters then only need to call the ramps. Basic atmosphere (CSS sky, shadows) lands in M2; final atmospheric polish is M8. A dev-only theme preview inside M2 catches theme-incompatible art **early**, before the castle and cathedral are built.

## M0 — Inspect and baseline (no code) — **complete**
- **Status:** done on `feat/town-world-redesign` at baae9e6, read-only, no files changed. Findings are in Appendix 1 and drive Part D.
- **Not measured in M0:** cache build time, ground-only paint cost, pan frame time, live screenshots (no browser; dependencies not installed). Tests, typecheck and build were not run. Visual baselines: `docs/reference-art/*.png` and the four earlier screenshots.

## M1 — Theme-ready foundation (no intended visual change)
- **Purpose:** make the existing renderer theme-ready with the smallest possible change, prove that a theme change invalidates and rebuilds the existing flattened cache correctly, and measure what that costs. Nothing visual changes.
- **Scope, in this order:**
  1. **Baseline first, on unchanged rendering code.** Add the dev-only instrumentation of item 5, then record the baseline numbers and the parity checksum (twice, to confirm the render is deterministic).
  2. **Typed theme definition.** A `Theme` type with a typed `ThemeId` (the six planned ids as a union; only `daytime-meadow` is defined) over the **existing** palette fields. No fields for later features (shadow, grade, emissive, surface and so on): each is added by the milestone that consumes it. Daytime Meadow keeps exactly its current values and is the default reference theme.
  3. **Active-theme state.** One source of truth for the active theme, defaulting to Daytime Meadow, readable and subscribable outside `TownCanvas` (D7 requirement 3). Derived palettes continue to be computed from it by the existing functions. Painters are not touched.
  4. **Cache invalidation on theme change.** Verify the existing theme-keyed cache against the active-theme state and fix only what is wrong, locally. A theme change must follow D5: cancel any in-flight upgrade and discard its result, release the old high tier, paint a new 1× tier, swap, release the old 1×, schedule the upgrade, request a draw. Setting the already-active theme must not rebuild.
  5. **Temporary dev-only timing and parity instrumentation.** Using `performance.now()` or marks, guarded for development builds only: cold 1× build ms; upgrade wall-clock ms and slice count; theme switch → new 1× on screen ms; theme switch → upgrade swapped ms; tier canvas dimensions and estimated bytes; count of live cache canvases; and a one-time parity checksum (FNV-1a over `getImageData` of the 1× tier, build-time only). Console output only, no UI.
  6. **Dev-only test theme,** reachable only in development (for example from the console): a clearly different palette variant used solely to prove invalidation. Never shipped, never selectable in production, removed or inert at the end of M1.
  7. **Overlay-compatibility check (verify only).** Confirm D7 requirements 1–8 by reading code and record pass, fail or not applicable for each. Write no overlay code.
- **Expected result:** output identical to baseline; theme state and invalidation in place; a table of measured numbers.
- **Dependencies:** M0.
- **Systems likely involved:** `themes.ts` and a small active-theme state module; the cache controller in `TownCanvas.tsx` (cache key, upgrade cancellation, tier release); dev-only instrumentation. **Not involved:** `terrainPainter`, `buildings/*`, `decor/*`, `depth`, `projection`, `bounds`, `data/*`, `styles.css`, and the sky setup in `main.tsx`.
- **Acceptance criteria** (all must pass; "not tested" is not a pass):
  1. **Parity.** The 1× parity checksum after M1 equals the baseline checksum exactly, same machine and browser. Fallback if readback is unavailable: zero differing pixels between before and after screenshots at the three fixed baseline cameras. Any difference is reported with count and location and is never accepted as "close enough".
  2. **Invalidation.** Daytime → test theme: the 1× checksum changes and the screen shows the test palette (not a stale cache); after the upgrade completes the high tier also shows the test palette. Test theme → Daytime: the 1× checksum equals the baseline.
  3. **Race.** Switching A → B → A during an in-flight upgrade ends on the final theme only. No stale tier is ever swapped in; no console errors.
  4. **No redundant rebuild.** Setting the already-active theme triggers zero rebuilds (counter).
  5. **No leak.** After 20 dev theme switches the live cache canvas count and estimated bytes return to the pre-switch steady state, and estimated peak offscreen bytes during a switch never exceed the baseline peak measured during a cold upgrade (counters).
  6. **Measurements recorded** (median and range over 5 runs, machine and browser stated): cold 1× build; upgrade wall-clock and slices; switch → new 1× on screen; switch → upgrade swapped; tier dimensions and bytes at the default window and at max zoom. Pan frame time via the browser profiler if a browser is available, otherwise listed as not measured.
  7. **No regression.** Pan, zoom, hover (`pickTile` readout) and destinations behave as before (manual check). Existing tests, typecheck, lint and production build run once at the end and are reported honestly.
  8. **Production cleanliness.** The production bundle contains no instrumentation, checksum code or dev theme (verify by searching the built output for their marker names).
  9. **Footprint.** The change list touches no painter, depth, projection, bounds, data or styles file. The report lists every changed file.
  10. **Overlay-compatibility report** present: D7 requirements 1–8, each with a verdict and file references.
- **Stop conditions** (stop, change nothing further, report):
  1. The baseline is not deterministic (two baseline checksums differ), or no browser or canvas environment is available to measure it. Parity cannot then be claimed.
  2. Correct invalidation would need a change to a painter's signature, the per-tile paint order, depth sorting, or the cache extents and tier logic beyond cancelling and releasing tiers.
  3. The typed theme or active-theme state would need hex values to move out of `themes.ts`, the output of `buildingPalette` or `terrainPalette` to change, or any ADR or `CLAUDE.md` rule to change (Part H).
  4. Any unexplained appearance change at any step.
  5. A stale or old-theme tier can still be swapped in and the fix is not local to the cache controller.
  6. The work needs a new dependency, worker, WebGL or any new full-size canvas.
  7. A D7 requirement fails and fixing it would need structural change. Report; do not fix.
- **Report but continue:** if the synchronous 1× build exceeds about 150 ms on the developer's machine, or a mid-range phone shows a long visible stall, report it as the D6 decision trigger. No mitigation is built in M1.
- **Performance checks:** the numbers in criterion 6. First load must not be slower than baseline beyond noise (compare dev timings before and after).
- **Exclusions:** geometry, painter redesign or edits, shadows, palette or value changes, any visual enhancement, sky changes, theme selector UI, persistence, crossfade, overlay canvas or scheduler, animation, feature registry, final passes (haze, grade), ground/object split, new caches, per-theme cache retention, chunked 1× build.

## M2 — Daytime Meadow: lighting, value structure, shadows
- **Scope:** E1 in full: extension of the existing palette derivation with the B4 material tones (per Part H2) and the form-lighting helper applied to existing painters; figure/ground retune; contact AO and eave bands; **incremental improvement of the existing baked shadows (D3)**, starting with reading the shadow code and reporting what it can express; the existing CSS sky variables driven from the active theme (the sky is already CSS; no migration); saturation caps.
- **Expected result:** the same town, now with volume, grounded objects and a clear value hierarchy. Same geometry.
- **Dependencies:** M1.
- **Systems likely involved:** existing building, wall, tower, tree and prop painters; the shadow code in `scene.paintTile`; ground painter colours; theme module and palette derivation.
- **Acceptance:** E1 success tests; **no overlapping-shadow darkening; no shadows on facades or cliff faces** (check named crops); shadows stay on same-level ground and keep their slot in the paint order; a dev-only preview of three parameter sets (long-shadow dusk, night palette with a floor, overcast) rebuilds the cache for each and renders with stone and plaster still legible; destination hotspots unobstructed.
- **Performance checks:** full cache rebuild ≤ M1 baseline + 15%; theme-switch time recorded against M1; pan frame time unchanged.
- **Exclusions:** new building shapes, textures, vegetation redesign, water changes, selector UI, shipping any non-Daytime theme, a separate shadow pass or layer, any ground/object split, new caches.

## M3 — Building families, materials, variation framework
- **Scope:** E2. Seeded variation helper, six families, neighbour rule, roof and facade materials, jetties, shutters, three yard types.
- **Expected result:** a varied skyline; no two neighbours alike; facades with depth.
- **Dependencies:** M2 (ramps and form lighting).
- **Systems likely involved:** building painters and the building-kind to family mapping.
- **Acceptance:** E2 success tests; footprints and depth-sort bounds respected (≤ 4 lp overdraw); hotspots clear.
- **Performance checks:** full cache rebuild ≤ M1 baseline + 25%; no per-frame cost.
- **Exclusions:** castle, cathedral, props beyond yards, new buildings, footprint changes.

## M4 — Castle
- **Scope:** E3 including the shared masonry painter.
- **Expected result:** a believable seat of power with a dominant keep.
- **Dependencies:** M2, M3 (variation helper).
- **Systems likely involved:** castle painters, tower and wall painters, a new masonry painter.
- **Acceptance:** E3 success tests; plateau and wall placement unchanged.
- **Performance checks:** full cache rebuild delta recorded; masonry detail simplifies at aerial zoom.
- **Exclusions:** cathedral, moat (S2), courtyard layout changes.

## M5 — Cathedral
- **Scope:** E4, reusing the masonry painter.
- **Expected result:** the lightest, most luminous landmark, clearly different from the castle.
- **Dependencies:** M4.
- **Systems likely involved:** church painters, a Gothic window helper.
- **Acceptance:** E4 success tests; stained glass painted so a lit variant is possible later (T2).
- **Performance checks:** full cache rebuild delta recorded.
- **Exclusions:** footprint changes (S3 needs approval).

## M6 — Vegetation and ecology
- **Scope:** E5. Species sprite atlas, zoning, forest mass, ground cover. Tree shadows through the existing shadow code. **First step: record a checksum and count of the planned tree list (positions) before any change.**
- **Expected result:** a believable forest and meadow with clearings and edges.
- **Dependencies:** M2.
- **Systems likely involved:** tree and vegetation painters and placement data (read-only).
- **Acceptance:** E5 success tests; planned tree list identical to the recorded pre-M6 checksum (existing hash indices and placement rules untouched); hotspots clear.
- **Performance checks:** full cache rebuild not worse than M1 baseline + 15% despite more variety (atlas reuse); shadow cost recorded.
- **Exclusions:** autumn groves, sway, ground-cover animation, moving trees.

## M7 — Terrain, roads, water, cliffs, base
- **Scope:** E6 and E7. Atlas-based ground, macro tint layer, road hierarchy, cliff strata, base cross-section, water edge and depth.
- **Expected result:** layered ground, clear streets, convincing river and cliffs.
- **Dependencies:** M2, M4 (masonry).
- **Systems likely involved:** ground and water painters, cliff painter, world-base painter.
- **Acceptance:** E6 and E7 success tests; masks unchanged; ground painting cost recorded and the full rebuild within the D6 guard.
- **Performance checks:** ground painting time; full cache rebuild time and theme-switch time.
- **Exclusions:** animated water, reflections, caustics, ripples.

## M8 — Daytime polish, hierarchy, props, sign-off
- **Scope:** E8 (three districts), E9, aerial LOD simplification, optional autumn groves, tuning pass.
- **Expected result:** **Daytime Meadow signed off as finished.**
- **Dependencies:** M3–M7.
- **Acceptance:** E8 and E9 success tests; full Part G run for Daytime.
- **Performance checks:** final budgets met.
- **Exclusions:** other themes, animation.

## Later track — Themes (after M8 sign-off)
Each: parameter set from C3, any new mechanism, acceptance, exclusions. Order by increasing new mechanism.

| ID | Theme | New mechanism | Acceptance highlights | Exclusions |
|---|---|---|---|---|
| **T1** | **Sunset Dream** + **theme selector UI** | Palette derivation and shadow parameters (long shadows, warm tones). Selector, persistence, transition per C5 (instant or memory-neutral dip), reduced-motion instant swap | Clamped long shadows look right on plateau and cliffs within what the existing shadow code supports; a switch rebuilds the cache correctly and meets the measured D6 guard; selector keyboard and touch accessible | Clouds, birds |
| **T2** | **Cozy Night** | Baked lit-window fills and lamp and fire ground pools; night palette with a floor | Stone still legible; lit windows chosen per window by seeded hash; no crushed blacks | Halos, flicker, fireflies |
| **T3** | **Rainy Evening** | Wet tones painted by the ground and roof painters (road darkening, sheen, seeded puddles), diffuse lighting | Roads read as wet; slate sheen; shadows near-off | Rain, ripples |
| **T4** | **Snowy Cabin** | Snow tones and caps painted by the roof, ground and tree painters; frozen water edges | Snow follows roof planes; ridges and eaves readable; roads read as roads | Snowfall |
| **T5** | **Enchanted Forest** | Accent glow points (baked); foliage hue via the theme's own palette, no special mechanism | Magical without destroying readability | Fireflies |

## Later track — Animation (after M8; interleave with themes as dependencies allow)

| ID | Scope | Key dependencies | Acceptance highlights |
|---|---|---|---|
| **A1** | Animation runtime: `AnimationPolicy`, render-on-demand scheduler, visibility pause, reduced-motion and toggle, zoom LOD, overlay canvas, pooled particles. One trivial test effect only | M8 | Ambient frames do not rebuild or redraw the cache canvas; tab hidden = zero frames (visibility handling is added here); reduced motion = static frame per camera change |
| **A2** | Chimney smoke, flags and banners (cloth moves out of the cache via a no-cloth painter variant), cloud shadows | A1; the anchor registry is introduced here | No ghosting; low CPU; off when toggled |
| **A3** | Water shimmer, waterfall, bridge foam; rain ripples after T3 | A1, T3 for ripples, D7 gate | Occluders erase correctly where bridges overlap water |
| **A4** | NPCs and animals with silhouette occlusion | A1, D7 gate | Actors pass behind buildings correctly; zero cost when zoomed out |
| **A5** | Weather and ambience: rain, snowfall, fireflies, lamp flicker, window halos | A1, T2–T5 | Density scales with zoom and device; pause correct |

Each animation milestone excludes new static art and any change to the static cache content other than moving animated parts out of it (A2).

---

# PART G — MASTER ACCEPTANCE CHECKLIST

**Visual quality**
- [ ] Greyscale squint test: value order and landmark separation as in E1.
- [ ] Silhouette tests: at least six house shape groups, four tower types, eight tree shapes.
- [ ] Neighbour rule never violated.
- [ ] No stepped or flat-fill water, roads or cliffs.
- [ ] Castle and cathedral identifiable in black and distinct in material and colour.
- [ ] Hierarchy: landmarks first, forest recedes.

**Theme compatibility**
- [ ] Painters do not read the active theme or import the theme module; they receive derived palettes and parameters (grep check).
- [ ] The cache contains no animated elements, weather particles or sky. Shadows, wetness, snow and lit-window fills appear only as painted in sequence from the active theme.
- [ ] A theme switch rebuilds the cache fully and correctly: no stale tier is shown, no old-theme upgrade is swapped in, and live cache canvases return to steady state (counters).
- [ ] Left-lit and right-shaded face order holds in every theme.
- [ ] Stone mortar lines and roof material identity readable in every implemented theme.
- [ ] When the registry exists (A2, A5), its markers align with the anchors they describe (debug toggle).
- [ ] Shadows never land on facades or cliff faces; no overlap double-darkening.

**Animation readiness**
- [ ] Depth key and entity bounds queryable (D7).
- [ ] No animated content baked into the cache.
- [ ] Policy defined: reduced motion, in-app toggle, hidden tab, zoom LOD, 30 fps ambient.

**Performance** (starting budgets; measure and adjust)
- [ ] No new full-size offscreen canvas; peak offscreen bytes never above the pre-existing upgrade peak (about 75 MiB [E]) plus a viewport-sized overlay (D6).
- [ ] Full cache rebuild and theme-switch times recorded against the M1 baseline; D6 decision triggers reported if hit.
- [ ] Full cache rebuild ≤ M1 baseline + 15% after M2 and + 25% after M3, and not growing across later milestones without a note.
- [ ] Pan frame time ≤ baseline + 0.5 ms.
- [ ] No memory growth after repeated theme swaps and zoom changes.
- [ ] No per-frame pixel readback.

**Accessibility**
- [ ] DOM navigation, labels and hotspots unchanged and unobstructed.
- [ ] `prefers-reduced-motion` and the in-app toggle respected by every animation and by theme crossfade.
- [ ] Theme selector (T1) fully keyboard and touch operable.
- [ ] Hint text and UI contrast not reduced by theme grade (UI is DOM and unaffected).

**Preservation**
- [ ] World data diff empty.
- [ ] Footprints, masks, elevation, camera, navigation unchanged.
- [ ] Existing renderer, depth sorting and cache mechanism retained.
- [ ] Tree placement identical (existing `hash2` inputs and placement rules untouched).
- [ ] Structural items (Appendix 3) unapproved and untouched.

---

# PART H — PROJECT RULES THAT MAY NEED AN EVENTUAL ADR OR `CLAUDE.md` CHANGE

**Nothing here has been changed.** Each item is identified for your decision. v3 is written so that nothing in it depends on an item being approved, except where marked. Statements about ADRs and `CLAUDE.md` come from the M0 summary; the ADR text was not re-read for v3.

| ID | Source | Conflict or gap | Default in v3 | Eventual change if you approve |
|---|---|---|---|---|
| H1 | `CLAUDE.md`: "flat-shaded, no per-pixel texture". ADR-024: forbids random per-pixel noise, allows authored pixel detail | v2 materials (masonry coursing, roof courses, cobble setts, hash-chosen tile variants, ±1-step per-block tonal variation, macro ground tint) are authored and deterministic, which ADR-024 appears to allow but the `CLAUDE.md` wording forbids | Not touched in M1. M2–M7 use only deterministic, authored detail, never random per-pixel noise. The macro tint is driven by world data with no noise function. Anything that needs interpretation waits for your ruling | Align the `CLAUDE.md` wording with ADR-024, and add a short ADR note defining "authored detail" (seeded per tile or per block is allowed; random per pixel is not) |
| H2 | `CLAUDE.md`: "hex only in `themes.ts`". Existing `mix` → `{lit, shade, dark, light}` tones | B4 specifies 5-step hand-picked ramps | Base colours stay in `themes.ts`; the extra tones (highlight, deep) are derived by `mix` in the derivation functions; B4 hex values are design targets reached by tuning base colours and mix parameters | If `mix` cannot reproduce acceptable ramps: an ADR permitting authored ramp hex values inside `themes.ts` (still the only place), possibly growing the tone set from 4 to 5 |
| H3 | ADR-023 (cache; dynamic elements get a separate layer) | Consistent with v3. No conflict | None | Add an ADR or addendum when T1 ships ("a theme switch rebuilds the flattened cache; one theme's cache at a time") and when A1 ships ("viewport-sized overlay canvas, `pointer-events: none`, shares the view transform") |
| H4 | ADR-016 to ADR-025 as a set | Not re-read for v3 | None | Check the wording for any rule that says a theme change must avoid a cache rebuild (none was reported in M0) |
| H5 | `CLAUDE.md` and lint conventions on console output | M1 dev-only timing logs to the console | Guarded for development builds, absent from production | If lint forbids console calls in dev code, a narrow exception for dev instrumentation |
| H6 | `CLAUDE.md` says Go (ADR-013); the Project instructions say Hono (carried from M0) | Unrelated to rendering and unresolved | None | Resolve separately |

---

# APPENDIX 1 — M0 findings (answered; the basis for Part D)

1. **Cache:** one flattened cache, not chunks. A 1× tier painted synchronously, a max-zoom tier built in 3 ms slices and capped at 64 MiB. Sizing in `render/cacheResolution.ts`, extents in `render/bounds.ts` [M]. DPR handling was not separately reported [?].
2. **Terrain versus entities:** interleaved per tile in depth order; cliff faces are painted in the same loop as terrain [M]. Ground/object separation is unsafe (D3).
3. **Sprites:** no per-entity bitmaps. Painters draw paths into the cache context; only `Placement` origin and height are queryable [M].
4. **Sky:** CSS gradient on `.world-viewport` from `--c-sky-*` (set once in `main.tsx`). The canvas is transparent outside the world. No vignette [M].
5. **Frame loop:** on-demand `scheduleDraw` (wheel, pan, resize). No continuous loop and no `visibilitychange` handling in the canvas. `useAmbientMotion` sets `data-motion` and `data-page-hidden` and honours reduced motion [M].
6. **Trees:** not stored; derived in `decor/plan.ts` from `hash2(x,y,n)` plus terrain masks. Tree count not executed [?].
7. **Colours:** hex only in `themes.ts`, derived to `{lit, shade, dark, light}` by `mix`. Painters receive `buildingPalette` and `terrainPalette` [M].
8. **Hover:** a DOM developer readout via `pickTile`. Destinations are not interactive yet; no canvas hover or highlight [M].
9. **Measurements:** map 80×60, tiles 32×16, level height 10 px, bounds width 2,240 px [M]. Cache sizes and peak memory are estimates [E]. Build time, ground-only paint cost and pan frame time are unmeasured [?].

# APPENDIX 2 — Prompt template (paste per milestone)

> Read **Part 0** of the spec, then implement **Milestone N** only, using the Part E subsections it names. Inspect existing code once and reuse what exists. Make the smallest change that meets the milestone's acceptance criteria. Do not commit, push, merge, or change branches. Do not create documentation files. Do not start the next milestone. Take at most three screenshots (aerial, mid, close). Run existing tests, typecheck, lint and build once at the end. Report in 15 lines or fewer: files changed, what was tested and results, measurements, what was not tested, open questions. If anything conflicts with Part D or needs a structural change, stop and ask.

# APPENDIX 3 — Structural changes (not approved unless you approve them)

| ID | Possible change | Default |
|---|---|---|
| S1 | Lean-tos or sheds outside a footprint | Do not do |
| S2 | Moat or dry ditch around the castle | Do not do |
| S3 | Cathedral transept or apse beyond the footprint | Only inside footprint, else ask |
| S4 | Building heights beyond current sprite bounds | Only if hotspot check passes |
| S5 | Surrounding table, mist or ocean around the diorama | Visual only; camera bounds unchanged |
| S6 | Moving tree positions, or changing existing hash inputs or placement rules | Do not do |
| S7 | Adding `O`, `G`, `T` caches and a ground/object split | **Withdrawn in v3.** Unsafe for depth (D3). Do not do |
| S8 | Moving the sky from the canvas to a CSS background | **Withdrawn in v3.** The sky is already CSS (M0) |
| S9 | Adding an overlay canvas | Deferred to A1; requires approval then |

# APPENDIX 4 — Reference summary (study, do not copy)
Retained from v1: *Tiny Glade* (irregularity and warm light), *Townscaper* (palette harmony and adjacency), *Dorfromantik* (diorama board and base), *Manor Lords* (medieval plots and weathered materials), *Songs of Conquest* (pixel-art landmark readability), *Age of Empires II DE* (consistent baked lighting across sprites), eBoy-style isometric pixel art (density and vignettes). Added for theme work: *Octopath Traveler* (HD-2D) for colour grade, haze and night mood (without tilt-shift or heavy bloom), and *Kingdom Two Crowns* for day-to-night light logic and layered silhouettes. Architectural: Rothenburg, Quedlinburg, Bruges, Conwy, Carcassonne, Salisbury, Strasbourg. These come from my general knowledge and are not verified against current builds.

# APPENDIX 5 — v2 → v3 change log

**Architectural replacements**
- **Part D rewritten.** The `O`/`G`/`T` architecture, the ten-step `T` build pipeline, the feature registry as an M1 deliverable, the 256/128 MB budgets and the "ground replay ≤ 150 ms" gate are removed. D1–D9 now describe the actual renderer, effect classification, theme-change lifecycle, memory and performance, overlay requirements, loop policy and the v1 reassessment. Old D8 → D7, old D9 → D8, old D10 → D9; old D2–D7 are gone.
- **M1 redefined** as a small theme-ready foundation.
- **S7 and S8 withdrawn** (Appendix 3).

**Every cross-reference changed because of the removed architecture**
- **Header and use:** title (v3), preface, "How to use" (Appendix 1 now holds M0 findings).
- **Part 0:** 0.1 (adds flattened cache and order, shadow position, CSS sky, tree placement); 0.2 (adds dev-only instrumentation bullet); 0.3 rules 1 (painters receive derived palettes), 2 and 6 (v2's "no shadows in `O`" and "never baked into `O`" replaced by rules 2, 3 and 7), 4 (no random noise, hash indices), 5 (dev-only checksum exception), 10 (colour conventions); 0.4 (Appendix 1 reference).
- **Part B:** B1 (lighting "at composite time"); B3 (azimuth deferred, form-shading tone count, diffuse themes "via the theme build"); B4 (convention note, "grade supplies warmth"); B7 (ground "macro-noise").
- **Part C:** C1 both tables (A/B/C locations; shadows, windows, glow, wet and snow rows; ground row); C2 (mechanism column for key, shadow, ambient, grade, haze, water, emissive, surface; "Parameters versus new code" replaced; re-bake escape hatch withdrawn); C5 (rebuild instead of "no painter re-runs"; crossfade policy).
- **Part D:** D9 rows for hue-shifted ramps, flat shadow layer, shadow length, contact shadows, atmosphere pass, window glow, per-pixel ground noise.
- **Part E:** E1 (target; changes 1, 2, 5, 6; theme-readiness); E2, E3, E4 theme-readiness (registry removed); E5 (placement frozen with hash rules, orange accents as appearance only, theme-readiness, success adds placement snapshot); E6 (target, change 1, theme-readiness, avoid, success); E7 (theme-readiness, success); E8 (lamp posts).
- **Part F:** M0 marked complete; M1 rewritten; M2 (scope, acceptance, performance, exclusions); M3 (scope, acceptance, performance); M4 (acceptance, performance); M5 (acceptance, performance); M6 (scope, acceptance, performance); M7 (acceptance, performance); Themes intro wording; T1, T2, T3, T4, T5 rows; A1, A2, A5 rows; A3 and A4 rows ("D8 gate" → "D7 gate", renumbering); animation exclusion sentence.
- **Part G:** theme-compatibility items 1–3 and the registry item; animation-readiness items 1–2; performance items 1–3 and 6 (budgets); preservation (adds tree placement).
- **Appendices:** Appendix 1 (questions replaced by findings); Appendix 3 (S6, S7, S8); "Honest limits".
- **Added:** Part H (ADR and `CLAUDE.md` items), this Appendix 5.

**Unchanged:** Part A; B2, B5, B6, B8; C3 (the six themes and their values); C4; the bodies of E3 and E4; E9; M8; Appendix 2 and 4.

**Noticed but deliberately left unchanged** (not dependent on `O`/`G`/`T`): Part A root cause 2 and the A3 "Light and atmosphere" line say there are no cast or contact shadows. M0 found baked shadows already exist (flat 20% rectangles, same level only), so v1's premise was partly wrong. Suggested one-line correction when you approve; it does not affect any milestone.

# Honest limits
- The renderer and cache files were read in M0; nothing was run. Items tagged [E] are estimates and [?] are unknown. Build and timing numbers arrive with M1.
- The shadow code was summarised in M0, not read line by line for this spec. What it can express (longer shadows, other directions, cross-level shadows) is an M2 finding.
- Blend-mode behaviour over the cache's transparent corners is unverified. Palette derivation is the default for grade precisely so nothing depends on it.
- Theme numbers are starting points for tuning by eye.
- ADR and `CLAUDE.md` statements in Part H come from the M0 summary; the ADR text was not re-read for v3.
