# Development Roadmap — Mayn's World

Phases are listed in implementation order. Phase 0's foundation pull request is merged; Phase 1 is in progress.

## Phase 0 — Governance and design approval (foundation PR merged)
- Confirm requirements, architecture and visual design.
- Add `CLAUDE.md`, GitHub templates and a CI skeleton.
- Establish protected `main`, branch naming and CI expectations.
- No application implementation until documents are approved.

Acceptance: the foundation pull request is reviewed and approved by the owner; `main` is protected; the foundation CI check passes.

## Phase 1 — Technical foundation (in progress)
Done:
- React, TypeScript, Vite and Tailwind CSS skeleton with a health-check page.
- Go (`net/http`) backend with `GET /api/health`, JSON 404s, graceful shutdown and tests (ADR-013).
- Single-origin serving: the Go server serves the built React app and `/api/*`.
- CI: frontend checks, Go checks and an integration smoke test.
- Multi-stage Dockerfile (Node build stage, Go build stage, distroless non-root runtime) and a CI job that builds it, runs the container and smoke-tests it.

- Docker Compose for local development: app plus PostgreSQL 17, named volume, `pg_isready` health check, app waits for a healthy database (ADR-014).
- `pgx` connection pool (`internal/db`), optional `DATABASE_URL`, and a database-aware `GET /api/health` (200 or 503).
- CI: PostgreSQL service for the Go tests, and a Compose job covering health, persistence and recovery.

Remaining:
- Linter and formatter choices for the frontend; `golangci-lint` for Go if wanted.

Acceptance: clean local Docker startup and production image startup. Phase 1 is not complete until the linter and formatter decision is made and the owner has run the Compose stack locally.

## Phase 2 — Data foundation
- Goose SQL migrations and the `pgx` connection pool.
- Admin identity/session foundation.
- Projects and blog data models.
- Contact submission and analytics models.
- Migration tests against PostgreSQL.

Acceptance: migrations can be applied to an empty database and backed up/restored.

## Phase 3 — Exploration prototype (in progress)
Done (frontend visual foundation):
- One environment: the Daytime Meadow, drawn as inline SVG pixel art (cabin, notice board, mailbox, signpost, trees, path, clouds, sun).
- Clickable destinations: the cabin (About), notice board (Projects), mailbox (Contact) and signpost planks (Blog, Resume, GitHub). Each opens a placeholder panel; GitHub opens the owner's profile in a new tab.
- Destination index: a plain `<nav>` list of all six destinations.
- Keyboard and touch navigation, visible focus rings, descriptive labels, a skip link and landmarks.
- Responsive layout: interactive scene from 720px wide; below that the scene is a scenic banner and the index becomes large touch cards.
- Ambient motion (drifting clouds, swaying flowers) with an in-page switch, a saved preference and `prefers-reduced-motion` support.

Done (town render foundation, milestone 1):
- `layout.json` copied unmodified into `src/client/world/data/`, with a validating loader.
- Isometric projection, back-to-front drawing order, tile picking and a terrain painter, each with tests (ADR-016).
- A 32 x 24 tile terrain patch drawn on a canvas below the meadow, with elevation, cliff faces, water and a tile-under-cursor readout.

Remaining for the town: buildings, vegetation and props; the full 80 x 60 map; camera (pan and zoom); selectable destination buildings; ambient life. The meadow stays until the town replaces it.

Remaining:
- Real destination pages (Phase 5). Until then each destination shows a placeholder panel and nothing else.
- Optional avatar and movement.
- Owner review of the art and layout, and a check on real phones and tablets.

Acceptance: visitors can reach every core destination without avatar movement. Met for navigation to the placeholder panels; the phase stays open until the owner has reviewed it.

## Phase 4 — Pixel UI and theme engine (started)
Done (frontend visual foundation):
- Centralized theme registry (`src/client/world/themes.ts`): a typed palette becomes CSS variables. One theme exists, Daytime Meadow, with a test that checks its text and focus-ring contrast.
- Reusable pixel UI: `PixelSprite`, `PixelPanel`, and the `pixel-button` and `pixel-card` styles.
- A self-hosted pixel heading font.

Remaining:
- The other five themes (Cozy Night, Rainy Evening, Sunset Dream, Enchanted Forest, Snowy Cabin), each a new palette plus any scene changes.
- Theme switcher, theme persistence and crossfade.
- Polish pass on the first theme.

Acceptance: themes change presentation without changing functionality.

## Phase 5 — Public content
- Home and About.
- Projects list/detail.
- Blog list/article pages.
- Resume page and PDF.
- Contact form.

Acceptance: public content works on desktop and mobile; drafts remain private.

## Phase 6 — Admin CMS
- Secure single-admin login/logout.
- Dashboard.
- Project CRUD.
- Blog CRUD and publishing workflow.
- Site settings.
- Contact inbox.

Acceptance: admin actions are authorized server-side and persist in PostgreSQL.

## Phase 7 — Integrations and insights
- GitHub API integration with server-side caching.
- Privacy-conscious analytics.
- Basic dashboard charts or summaries only if useful.

Acceptance: core site works when GitHub integration is unavailable.

## Phase 8 — Production deployment
- Neon Free project (confirm PostgreSQL 17).
- Render Docker web service.
- Environment variables and health checks.
- Migration procedure.
- Smoke tests.
- Backup and restore documentation.

Acceptance: production deploy works and database data survives app redeployment.

## Phase 9 — Hardening
- Security review.
- Accessibility review.
- Performance review.
- SEO and metadata.
- Dependency audit.
- Self-hosting rehearsal with local PostgreSQL.

Acceptance: review findings are resolved or tracked as verified issues, and the self-hosting rehearsal restores a production dump into local PostgreSQL.

## Delivery rules
Implement one phase at a time. Each phase should have a clear plan, tests, a diff review and human approval. Do not merge or deploy without explicit human approval.
