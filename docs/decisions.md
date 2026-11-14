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
