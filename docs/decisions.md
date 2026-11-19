# Architecture Decision Records — Mayn's World

Each record states the decision, the reason and the main trade-off accepted.

## ADR-001 — Render + Neon initially, self-hostable later
**Status:** Accepted. Backend wording amended by ADR-013: read "standard Node.js" as "standard Go".

Use Render Free for the Dockerized application and Neon Free for managed PostgreSQL. Keep the application provider-neutral and use standard Node.js and PostgreSQL. Future self-hosting uses Linux, Docker Compose, PostgreSQL, Caddy and optional MinIO.

Reason: free initial hosting with a practical migration path.

Trade-off: free tiers have quotas and limits that change, and free web services may respond slowly after idle periods. Accepted for a personal site; recheck provider terms at deployment time.

## ADR-002 — Docker is the deployment boundary
**Status:** Accepted

Use a multi-stage Dockerfile for the production app and Docker Compose for local development. The same app image should run on Render and a future Linux host.

Trade-off: adds Docker as a required local tool in exchange for identical behavior across environments.

## ADR-003 — One application service for v1
**Status:** Accepted. Still in force; the Go server (ADR-013) now plays the role this record gives to Hono.

Hono serves the built React app and `/api/*` from one origin. Avoid separate frontend/backend deployments initially to reduce operational complexity and CORS configuration.

Trade-off: frontend and backend deploy together and cannot scale independently. Irrelevant at this scale.

## ADR-004 — PostgreSQL is the durable data store
**Status:** Accepted. Migration tooling amended by ADR-013: Goose SQL migrations replace Drizzle migrations.

Use PostgreSQL 17 and Drizzle migrations. Do not rely on Render filesystem persistence. Use a future S3-compatible abstraction for uploads if required.

Trade-off: a managed database adds a network dependency, but the container stays disposable and data survives redeploys.

## ADR-005 — Exploration-based navigation
**Status:** Accepted

The pixel-art environment itself is the primary navigation interface. Every destination also has an accessible label and map/destination index. Visitors are not required to move an avatar.

Trade-off: a distinctive experience is harder to build and make accessible than a conventional menu, so a conventional fallback is always provided.

## ADR-006 — Optional avatar
**Status:** Accepted

The avatar is decorative, can be disabled, and is never required for navigation or content access.

## ADR-007 — Six-theme visual direction
**Status:** Accepted

Architect for Daytime Meadow, Cozy Night, Rainy Evening, Sunset Dream, Enchanted Forest and Snowy Cabin. Polish one theme before implementing the rest.

Trade-off: the theme registry is designed up front, but only one theme ships first, avoiding six unfinished scenes.

## ADR-008 — Human-led issue solving
**Status:** Accepted

Claude may implement approved milestones, review code and prepare verified issues. When the user is solving an issue, Claude must remain read-only, provide progressive hints and review the user's solution only after requested.

Reason: the owner wants to understand, debug and maintain the application.

Trade-off: slower than generating fixes directly, by design.

## ADR-009 — Branch and pull request workflow with human approval
**Status:** Accepted

`main` is protected. All work happens on task-specific branches and reaches `main` through pull requests with passing CI. Merging and deploying require explicit human approval. AI contributions are not disguised and commit attribution is not manipulated.

Trade-off: more ceremony than committing to `main`, in exchange for reviewable history and a clear human accountability point.

## ADR-010 — Free-first, no paid dependencies in core
**Status:** Accepted

Core operation must not require paid APIs, paid SaaS, a paid domain or an email service. Contact submissions are stored in PostgreSQL rather than emailed.

Trade-off: the owner reads submissions in the admin inbox instead of receiving email.

## ADR-011 — CI skeleton matches repository state
**Status:** Accepted

The initial CI workflow checks only what exists (documentation and templates). Application jobs are present but disabled, and are enabled in the phase that creates the matching scripts. Third-party actions are pinned to reviewed commit SHAs before hardening.

Reason: a green check must not imply that code was tested when no code exists.

Trade-off: CI coverage grows gradually and requires deliberate enabling.

## ADR-012 — Task 001 tooling: npm, Vitest, one root package, Tailwind v4
**Status:** Accepted for the frontend. Partly superseded by ADR-013: the Node server pieces (Hono, `tsx`, the server and build tsconfigs, `src/shared`, `npm start`) no longer exist. npm, Vitest, Tailwind v4, the client tsconfig and the Vite dev proxy remain.

- **npm** is the package manager. It ships with Node, so there is nothing extra to install or explain. The committed `package-lock.json` is the source of truth for versions, and CI installs with `npm ci`.
- **One root `package.json`**, not a workspace monorepo. Client, server and shared code live under `src/` as in `docs/architecture.md`. Workspaces can be added later if there is a concrete need.
- **Vitest** runs tests. It reuses the Vite config and handles TypeScript without extra setup.
- **Three tsconfigs.** `tsconfig.client.json` (browser: DOM types, bundler resolution), `tsconfig.server.json` (Node types, NodeNext resolution) and `tsconfig.build.json` (emits the server to `dist/server`). Browser and Node code need different type libraries, and separating them stops one from using the other's globals by accident.
- **Dev:** Vite proxies `/api` to Hono, so the browser sees one origin in development as in production (ADR-003) and no CORS configuration exists.
- **Production:** `vite build` outputs to `dist/client`; Hono serves it and `/api/*` from one origin. `npm start` runs the compiled server.
- **Shared contract:** the `/api/health` response type and a runtime type guard live in `src/shared/health.ts`. Schema-validation libraries are deferred until the API has inputs that need them.
- **Health path:** the endpoint is `/api/health`. `docs/architecture.md` mentions `/health` for Docker and Render health checks; reconcile that in the Docker task (for example with a root alias).
- **Linting is deferred.** No linter or formatter is configured yet.

Trade-off: no linter means style and some bug classes are unchecked for now; the three-tsconfig layout is more files in exchange for stricter, clearer boundaries.

## ADR-013 — Replace Hono on Node.js with Go (`net/http`) as the backend
**Status:** Accepted. Supersedes the backend technology in ADR-001, ADR-003, ADR-004 and ADR-012 (see their status lines).

**Decision (made by the owner):** the backend is written in Go using only the standard library (`net/http`). No Gin, Echo, Fiber or other web framework. The frontend stays React + TypeScript + Vite. Node.js and npm remain necessary to build the frontend, but Node does not run the production backend. When the database arrives (a later milestone, not part of this change), PostgreSQL 17 is accessed with `pgx` and schema changes are SQL migrations managed by Goose, replacing Drizzle.

**Reasons** (drafted to record the thinking; the owner should edit them to match their own):
- One compiled binary serves the API and the built React app. A production image needs no Node.js runtime, so it can be small and simple.
- The standard library is enough for this API. Since Go 1.22, `http.ServeMux` matches methods and path patterns, so no router dependency is needed. The Go backend has no third-party dependencies at all, and `hono`, `@hono/node-server` and `tsx` left the npm dependency tree.
- Plain, explicit code suits the owner's goal of understanding and maintaining the whole application.
- HTTP server timeouts, graceful shutdown and typed errors are first-class and easy to read in Go.
- `pgx` is a mature PostgreSQL driver, and Goose keeps migrations as reviewable SQL files, which matches the "migrations are the source of truth" rule.

**What did not change:** one origin (`/api/*` and the React app from the same server), the `GET /api/health` contract `{"status":"ok"}`, the Vite dev proxy approach, the product requirements, the pixel-art direction, the six themes, the admin scope and the Render + Neon deployment goal.

**Implementation choices:**
- Layout: `cmd/server` (entry point and shutdown), `internal/config` (environment), `internal/handlers` (handlers, JSON helpers, SPA serving), `internal/server` (routes, middleware, `http.Server` settings). No other packages until needed.
- Configuration: `PORT` (default 8080) and `STATIC_DIR` (default `dist/client`). The server always binds `0.0.0.0`.
- Errors under `/api` are JSON: `{"error":"not_found"}` (404) and `{"error":"method_not_allowed"}` (405, with an `Allow` header).
- Frontend serving: a request for an existing file returns the file. A path with a file extension that does not exist returns a plain 404, never `index.html`, so a missing script cannot come back as HTML. Any other path returns `index.html` for client-side routing.
- Development: Go on port 8080 and Vite on 5173 run as separate processes. Vite proxies `/api` to `http://127.0.0.1:8080` (IPv4 explicitly: Node may resolve `localhost` to `::1`, but the server listens on IPv4).
- The `/api/health` response type is declared twice, as a Go struct and as a TypeScript type with a runtime guard in `src/client/api/health.ts`. `src/shared` was removed because it only existed to share TypeScript between two TypeScript programs. Tests on both sides pin the JSON.
- `go.mod` declares `go 1.27`, matching the current supported Go toolchain used in CI. Keep the module directive and CI toolchain aligned, and revisit them when a newer supported release becomes the project baseline.

**Trade-offs accepted:**
- Two languages in one repository, and the Go toolchain is a new local and CI requirement.
- API types are duplicated across Go and TypeScript instead of shared. Tests catch drift; generating types from a schema can be considered once the API grows.
- A little more boilerplate for JSON decoding and validation than a TypeScript framework with a schema library.
- No Go hot reload is configured. Restart `go run` after backend changes; a watcher can be added later if it becomes annoying.
- The migration from Hono costs one milestone of work that adds no new user-visible feature.

## ADR-014 — Local PostgreSQL with Compose, and the database-aware health contract
**Status:** Accepted.

**Decision:** local development runs the app and PostgreSQL 17 with Docker Compose. The Go server opens a lazy `pgxpool` connection pool when `DATABASE_URL` is set, and `GET /api/health` reports database connectivity.

**Health contract:**
- No database configured: `200 {"status":"ok"}` (unchanged from ADR-013).
- Database answers a ping within 2 seconds: `200 {"status":"ok","database":"ok"}`.
- Otherwise: `503 {"status":"unavailable","database":"unavailable"}`.
- Clients see only those fixed words. The real error is logged on the server, because driver errors can contain host names and other internals.

**Choices and reasons:**
- **One endpoint, not liveness plus readiness.** Nothing yet needs to tell "process is alive" apart from "can serve traffic", and a second endpoint is more surface to test and keep consistent. Trade-off: a platform that restarts the service on a failed health check could restart the app during a short Neon outage or wake-up, when a restart would not help. This is accepted for now and must be revisited in Phase 8 (Render deployment); the fix is a separate liveness path for the platform check, leaving `/api/health` as the readiness view.
- **`DATABASE_URL` is optional until Phase 2.** Frontend-only development, the integration job and the Docker smoke job keep working with no database. It becomes required when the first feature needs the database. A malformed value stops the server at startup, with an error that never includes the URL.
- **Lazy pool.** The pool opens no connection at startup. The server therefore starts while the database is still waking up (Neon Free suspends idle databases) and reports the truth through the health check, instead of crash-looping.
- **`postgres:17` (Debian), not Alpine.** Alpine's musl sorts text differently from the glibc used by Neon and most Linux hosts, which would weaken the goal of restoring a dump in any environment.
- **`pg_isready -h 127.0.0.1`.** The official image runs a temporary Unix-socket-only server while initializing a new volume; a socket check would pass too early.
- **No health check inside the app image.** The distroless image has no shell or tools. The Compose database check uses the database image; the app is checked from outside through its HTTP endpoint.
- **The database port is not published.** Only the app container can reach PostgreSQL. A SQL shell is available with `docker compose exec db psql`.
- **`sslmode=disable` only inside Compose.** The traffic never leaves the private network. Production against Neon uses `sslmode=require`.
- **Goose migrations are not part of this change.** No tables exist yet. Migrations arrive with the Phase 2 data model.

**Trade-offs accepted:** the Compose password is placed in a URL, so it must avoid URL-special characters (documented in `.env.example`); `Config` hides the URL in formatted output, which costs a small `String` method.

## ADR-015 — Frontend visual foundation: SVG sprites, palette-driven themes, hash navigation
**Status:** Accepted. Partly superseded by ADR-016: the "SVG, not a canvas" choice no longer applies to the town's world-rendering layer. Everything else here still stands.

**Decision:** the Daytime Meadow home page is built from inline SVG pixel art written as text grids, themed through a typed palette that becomes CSS variables, with real DOM links over the art and a plain destination index beside it. Destinations are selected through the URL hash, with no router library yet.

**Choices and reasons:**
- **Inline SVG sprites from text grids, not a canvas or image files.** Keeps all content in the DOM (invariant: no whole-site canvas), needs no external or paid assets, cannot fail to load, and the art is reviewable as text in a pull request. Trade-off: hand-drawn art in this format is limited to small sprites; larger or animated art may later justify image sprite sheets.
- **Colours by name, values in a TypeScript palette.** One place defines every colour, sprites and UI never hold hex values, and a test can enforce contrast for every theme. Trade-off: the palette lives in JavaScript, so colours are applied by a small script before React renders instead of only by a stylesheet.
- **Real links over the art, plus a permanent destination index.** Exploration is the primary surface, but never the only one (invariant). Below 720px the scene's links are removed (not hidden) and the index becomes the main way in: tiny tap targets and duplicate tab stops are worse than a scenic banner.
- **URL hash instead of a router.** The pages do not exist until Phase 5, and a hash gives deep links and Back and Forward for free. Trade-off: hash URLs are replaced by real paths when pages arrive. That change is contained: `parseHash` and `useSelectedDestination`.
- **CSS-only ambient motion.** Only `transform` is animated; there are a few elements. Motion (the animation library) is not added because nothing needs it yet. The in-page switch is locked off when the operating system asks for reduced motion.
- **One new dependency, `@fontsource-variable/pixelify-sans`.** Self-hosts an open-licensed pixel font so no third-party font host is contacted. Only headings and labels use it. Body text stays in the system font.
- **No linter or formatter was added.** That decision is still open in Phase 1.

**Not yet decided:** theme switching and persistence (Phase 4), the real routing approach (Phase 5), whether the optional avatar uses sprites in the same format.

## ADR-016 — Canvas 2D for the isometric world-rendering layer
**Status:** Accepted.

**Relationship to ADR-015:** ADR-015 drew the meadow as inline SVG and rejected a canvas. That was right for a scene of about thirty sprites. It does not scale to the approved town: an 80 x 60 tile map is 4,800 tiles before buildings, trees, props and ambient animation, and an SVG document with that many nodes is slow to build, style and animate. ADR-016 therefore replaces the SVG choice **for the world layer only**. The rest of ADR-015 is unchanged: colours by name from the theme registry, real DOM links and a permanent destination index, hash navigation, CSS-only interface motion, and the self-hosted pixel font. The meadow files are not modified by this ADR (ADR-017 later removed the meadow from the page).

**Decision:** the isometric town is drawn with Canvas 2D in `src/client/world/`. React owns the `<canvas>` element and decides when to draw; the drawing logic lives in plain modules that know nothing about React.

**Boundaries (these keep the invariant "no whole-site canvas" true):**
- The canvas draws the world only: terrain, then later buildings, vegetation and ambient life.
- Text, links, buttons, forms and panels stay in the DOM. Destination buildings will get real `<a>` elements positioned over the canvas from the same projection, so keyboard and screen-reader navigation does not depend on the canvas.
- The canvas is `role="img"` with a text description until something in it is interactive.
- Navigation stays outside the renderer: it reports "building N was selected" and a destination lookup (`content/destinations.ts`) decides what that means.

**Structure (responsibilities kept separate and independently testable):**
- `world/data/`: `layout.json` (unmodified source of truth), `types.ts`, and `loader.ts`, which validates the file and turns the row strings into typed arrays.
- `world/render/projection.ts`: tile to screen maths (2:1 isometric, 32 x 16 tiles, 10 px per level) and its inverse.
- `world/render/depth.ts`: back-to-front drawing order.
- `world/render/picking.ts`: which tile is under a screen point.
- `world/render/terrainPainter.ts` and `terrainPalette.ts`: the only code that draws, and the theme-to-colour step.
- `world/TownCanvas.tsx`: the React component.

**Choices and reasons:**
- **No new dependency.** The browser's own Canvas 2D API is enough. A game engine would bring concepts and a bundle size this project does not need.
- **Colours come from the Theme object, not from CSS variables.** A canvas cannot read `var(--c-grass)`. `terrainPalette(theme)` reads the same typed palette that sets the CSS variables, so the canvas and the page cannot disagree and there are still no colour values outside `themes.ts`.
- **`layout.json` is copied into the repository unmodified** and validated at load. Visual detail that the JSON does not contain (roofs, tree species, castle height) will live in separate renderer-side files keyed to it, so the geography can be checked against the data alone.
- **Drawing resolution equals the art size** (1 canvas pixel = 1 art pixel). CSS scales it down only, with `image-rendering: pixelated`. It is never scaled up, because a non-integer upscale makes some pixels wider than others.
- **Each polygon is filled and then stroked in the same colour.** Anti-aliasing otherwise leaves hairline gaps between neighbouring diamonds.
- **A one-level "slab" under the patch's south and east edges** makes a cut-out of the map look like a solid block.

**Trade-offs accepted:** the world is not in the DOM, so nothing in it is automatically accessible or searchable; the accessible overlay and the destination index carry that duty. Canvas pixels cannot be unit-tested the way DOM can; tests cover the maths, ordering, data and the sequence of drawing calls, and the look is checked by eye. A theme change must trigger a redraw.

**Not yet decided:** the depth-sorting rule for buildings and other multi-tile objects, camera and zoom behaviour, how sprites are supplied (procedural, hand-made or generated), animation layers, and how the whole 80 x 60 map is cached for performance.

## ADR-017 — The isometric world is the full-window home page
**Status:** Accepted.

**Decision:** the home page is one canvas filling the browser window (`100vw x 100dvh`) and nothing else. The meadow scene, the "Where to?" destination index, the page header, footer and the centred narrow layout were removed from `App.tsx`. The visitor is meant to enter a world, not visit a page that contains a game preview.

**What was kept:** every removed component, `content/destinations.ts`, `content/home.ts`, the hash-navigation hooks and the meadow art remain in the repository, unused. Destinations will be connected to buildings in a later milestone through the same content modules. The renderer does not import any of them.

**Sizing:**
- The canvas fills its box and is redrawn when the box resizes (`ResizeObserver`, plus `resize` for device-pixel-ratio changes). Its drawing buffer is the box size times `devicePixelRatio`, so it is sharp on dense screens.
- The terrain is scaled by one number, the same horizontally and vertically, and centred (`render/viewTransform.ts`, "contain" fitting), so it is never stretched. The space around it is a sky gradient taken from the theme's sky colours.
- `dvh` rather than `vh`, so a phone's address bar showing or hiding does not push the bottom of the world off screen. `body` is `overflow: hidden` and the old `scrollbar-gutter` rule was removed because the page no longer scrolls.
- Pointer positions go back through the same transform before tile picking, so picking stays correct at any window size.

**Known consequences:**
- **Accessibility gap, deliberate and temporary:** with the destination index gone there is no navigation UI. Navigation is a stated invariant (a visible destination index and accessible fallback), so it must come back before any destination is considered reachable. The page keeps a visually hidden `<h1>` and the canvas has a text description.
- The 32 x 24 patch was a temporary stand-in; Milestone 2 (ADR-018) replaced it with the full 80 x 60 terrain. The terrain is still a wide diamond, so it is small on a tall, narrow screen.
- Scaling is fractional (not whole-number), which suits vector-drawn terrain. Bitmap sprites will need their own scaling rule (probably whole-number pixel scales) when they arrive.
- The ambient-motion switch and server-status line are no longer shown. Their code remains.

**Not yet decided:** camera pan and zoom (the fit calculation is the starting point), minimum and maximum zoom, and how the interface (title, map index, controls) overlays the world.

## ADR-018: Full-map terrain model and derived boundary materials

**Status:** Accepted (Milestone 2).

**Decision:** the renderer draws the complete 80 x 60 terrain from `layout.json`, replacing the 32 x 24 patch. Rendering is split into a pure terrain model (`src/client/world/terrain/`) and thin canvas painters (`render/`).

**Why a model:** the file gives a height and a water flag per tile, but not what each step between heights is made of. `terrain/edges.ts` derives it from rules that use only data in the file. The renderer needs this knowledge to be testable without a canvas, so the painter is a loop over the model.

**Derived materials, honestly:** `level_edges` in the file are totals without locations. Rules: water involved gives cascade or bank; a drop of 2 or more is cliff; a drop of 1 touching level 4 or higher is castle; any other drop of 1 is a retaining wall if at least half of its continuous straight run lies within one tile of a road, otherwise a grass slope, except at ramp and stairs tiles, which are always slope. Against the file's totals: castle 96 (exact), cliff 56 (exact), bank 4 (exact), slope + wall 285 (exact), but the split is 166 slope / 119 wall here against 152 / 133 in the file. The wall/slope split is therefore an approximation, isolated in `markRetainingWalls`, and may be changed on review.

**Drawing:** painter's algorithm in order of increasing `x + y`. For each tile the south face, east face and top are drawn. A face's bottom edge is produced by the same projection call as the lower tile's top edge, so there are no seams (tested for every step in the town). Lighting is from the upper left: south faces lit, east faces shaded. Water surfaces sit 0.4 level below land, are shaded by distance from the shore and have a pale shore line. The map is drawn as a solid block with cut faces on its south and east edges.

**Not done here:** roads (rasterised and loaded, so ramps, stairs and bridges can be drawn later, but not drawn), buildings, vegetation, props, animation, camera pan and zoom. The three duplicate-door pairs in `layout.json` remain unresolved and unchanged (see `src/client/world/data/README.md`).

**Known limits:** picking tests only the top surface of tiles, so a point on a cliff face returns the tile visible behind it. Terrain colours come from the theme, but only one theme exists.

