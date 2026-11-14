# Architecture — Mayn's World

> Status: target architecture. The application skeleton exists: a React frontend and a Go backend with `GET /api/health`, served from one origin. The production Dockerfile, the local Docker Compose stack and the PostgreSQL connection pool exist. Migrations, tables and everything else marked "planned" below do not exist yet.

## Principles
1. Docker-first and provider-portable.
2. One deployable application service for v1.
3. Standard Go and PostgreSQL interfaces.
4. Persistent data never lives in the application container filesystem.
5. Semantic HTML and accessible DOM for content and controls.
6. Clear separation between visual world, website features, API and data access.

## Stack
- Frontend: React + TypeScript + Vite.
- Styling: Tailwind CSS + custom CSS.
- Animation: Motion for selected interface animations (planned).
- Backend: Go, using only the standard library `net/http` (no web framework). See ADR-013.
- Node.js 26 LTS and npm: frontend tooling and builds only. Node never runs the production backend.
- Testing: Vitest (frontend); Go `testing` + `httptest` (backend).
- Database: PostgreSQL 17, accessed with `pgx` (`pgxpool`).
- Migrations (planned): Goose, as SQL files in `migrations/`.
- Multi-stage Dockerfile; Docker Compose for local development.
- Render Free web service + Neon Free PostgreSQL initially.
- GitHub Actions for CI.
- Caddy and optional MinIO for future self-hosting.

## Runtime topology
Browser -> Render Docker web service -> Go server.
The Go server serves the built React app and `/api/*` from one origin.
Go server -> Neon PostgreSQL using `DATABASE_URL`.

Local topology, current: two processes. The Go server listens on `:8080`. The Vite dev server listens on `:5173`, serves the React app with hot reload and proxies `/api/*` to Go. The browser only talks to `:5173`, so it sees one origin and no CORS configuration is needed.

Local topology with Docker Compose: Browser -> `localhost:8080` -> app container -> PostgreSQL container, over a private Compose network. Compose publishes only the app's port, bound to `127.0.0.1`. The app reaches the database at the hostname `db` (the service name, resolved by Compose's internal DNS) on port 5432. The database port is not published on the host.

Future self-hosted topology:
Internet -> Caddy -> app container -> PostgreSQL container.
Optional MinIO provides S3-compatible object storage.

## How React talks to Go
The frontend always uses relative URLs such as `fetch('/api/health')`. The same code works in both modes because the origin is always the same:
- Development: the browser requests `http://localhost:5173/api/health`; the Vite proxy (`server.proxy` in `vite.config.ts`) forwards it to `http://127.0.0.1:8080/api/health`.
- Production: the browser requests the Go server directly, and the same server also delivered the page.

The proxy target uses `127.0.0.1`, not `localhost`: Node may resolve `localhost` to the IPv6 address `::1`, but the Go server listens on IPv4.

API contract: request and response shapes are declared in Go (`internal/handlers`) and mirrored as TypeScript types in `src/client/api`. Each side has tests that pin the JSON, so a change to one side without the other fails a test. Errors under `/api` are JSON, such as `{"error":"not_found"}`.

## Source boundaries
Current:

- `cmd/server`: program entry point. Loads configuration, starts the HTTP server, handles shutdown signals.
- `internal/config`: reads environment variables (`PORT`, `STATIC_DIR`).
- `internal/handlers`: HTTP handlers, JSON helpers and the single-page-app file server.
- `internal/server`: route table, logging and recovery middleware, `http.Server` timeouts.
- `src/client`: the React app (`main.tsx`, `app/`, `api/`, `styles.css`).
- `index.html`, `vite.config.ts`, `tsconfig.client.json`: Vite and TypeScript configuration at the repository root.

- `internal/db`: opens the `pgxpool` connection pool. It is the only package that imports the driver; queries will be added here in Phase 2.

Planned (adapt names as needed, but keep these responsibilities):

- `src/client/world`: theme registry, scenes, ambient effects and world manager.
- `src/client/components/pixel-ui`: reusable pixel-art UI.
- `src/client/components/navigation`: destination interactions and map.
- `src/client/pages`: public and admin pages.
- `migrations`: Goose SQL migrations.
- `public`: static assets.

Do not put API, authentication or database logic in world-rendering modules. In Go, handlers should not contain SQL; they call into `internal/db` once it exists.

## Production frontend serving
`npm run build` writes the React app to `dist/client`. The Go server serves that folder (`STATIC_DIR`, default `dist/client`, relative to the working directory):
- An existing file is served as itself.
- A path with a file extension that does not exist, such as `/assets/gone.js`, returns a plain 404. It must never return `index.html`, or a browser would try to run HTML as JavaScript.
- Any other path (`/`, `/projects/3`) returns `index.html`, so client-side routing works.
- `/api/*` is handled first and never reaches the file server. Unknown API paths return JSON 404.
- `index.html` is sent with `Cache-Control: no-cache`, so a new deployment is picked up at once.
- If `dist/client` has no `index.html` (for example during backend-only development), the server logs a warning and serves the API only.

## Server behavior
- Listens on `0.0.0.0` and `PORT` (default 8080).
- Explicit read, write, header and idle timeouts.
- Logs one line per request: method, path, status and duration. Query strings, headers and bodies are not logged.
- A panic in a handler becomes a logged JSON 500 instead of a dropped connection.
- Graceful shutdown: on SIGINT or SIGTERM the server stops accepting new connections and gives in-flight requests up to 10 seconds to finish.

## Database and migrations
Implemented: the `pgxpool` connection pool (`internal/db`) and the database-aware health check. Planned (Phase 2): Goose SQL migrations in `migrations/` and the data model.

Use standard PostgreSQL features through `pgx` (`pgxpool` for the connection pool). Goose SQL migrations in `migrations/` are the source of truth. Do not use automatic schema synchronization against production as a migration strategy.

Pool behavior (constants in `internal/db/db.go`): at most 10 connections, none held open at minimum, connections recycled after 30 minutes and closed after 5 idle minutes, a background check every minute, and a 5 second timeout for each connection attempt. The pool is lazy: it opens no connection at startup, so the server starts even while the database is still waking up (Neon Free suspends idle databases) and the health check reports the real state. The pool is closed after the HTTP server has finished shutting down, so in-flight requests never lose their database.

`DATABASE_URL` is optional until Phase 2. If it is unset the server runs without a database. If it is set but malformed, the server refuses to start with a message that never includes the URL. `Config` prints the URL as `<redacted>`.

Use a connection pool with sensible limits. Neon pooled connection strings may be used for application traffic; a direct connection may be used for migration tooling if required. Keep migration behavior documented and repeatable.

When the Neon project is created, confirm it uses PostgreSQL 17 so local, CI and production versions match. Do not assume a provider default.

## Environment variables
Implemented:
- `PORT`: listen port, default `8080`.
- `STATIC_DIR`: folder with the built React app, default `dist/client`.
- `DATABASE_URL`: PostgreSQL connection URL, optional for now (required from Phase 2). Local Compose settings are `POSTGRES_DB`, `POSTGRES_USER` and `POSTGRES_PASSWORD`, read from a Git-ignored `.env` (template: `.env.example`).

Planned, at minimum:
- `SESSION_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`

Optional, planned:
- `DIRECT_DATABASE_URL`
- `GITHUB_TOKEN`

Use `.env.example` with placeholder values only. Production secrets belong in Render environment settings. Never bake secrets into an image.

## Docker
Dockerfile (implemented):
- Multi-stage: a `node:26-alpine` stage runs `npm ci` and `npm run build`; a `golang:1.27-alpine` stage compiles the server as a static binary (`CGO_ENABLED=0`); the final stage is `gcr.io/distroless/static-debian12:nonroot` and holds only the binary and `dist/client`. Node.js and the Go toolchain are not in the final image.
- Toolchain versions follow `.nvmrc` and `go.mod`. Base images are pinned by tag, not digest; digest pinning belongs to the Phase 9 hardening pass.
- Reproducible install from lockfiles (`package-lock.json`, `go.mod`).
- Lean production image; non-root runtime user (UID 65532). Distroless has no shell, so there is no `docker exec` debugging inside the image and no in-image `HEALTHCHECK` command. Health is checked from outside through `GET /api/health`.
- Listens on `0.0.0.0` and `PORT` (default 8080).
- Health endpoint: the platform health-check path is `GET /api/health`. There is no `/health` alias; point Render (and any Compose or monitoring check) at `/api/health`. Earlier drafts of these docs said `/health`.
- Graceful shutdown: the Go server handles `SIGTERM`; CI checks that `docker stop` exits with code 0.
- No secrets in image; `.dockerignore` keeps `.env*` and `.git` out of the build context.

Health contract (`GET /api/health`, ADR-014): with no database configured, `200 {"status":"ok"}`; database reachable, `200 {"status":"ok","database":"ok"}`; database not answering within 2 seconds, `503 {"status":"unavailable","database":"unavailable"}`. The client only ever sees those fixed words; the underlying error goes to the server log. There is one endpoint, not separate liveness and readiness endpoints (see ADR-014 for the trade-off).

Compose (`compose.yaml`, implemented, local development only):
- `app` service: built from the production Dockerfile, published on `127.0.0.1:8080`, `DATABASE_URL` built from `.env` and pointing at host `db`, `depends_on` the database with `condition: service_healthy`, `restart: unless-stopped`.
- `db` service: `postgres:17` (the Debian image, not Alpine, so text sorting matches Neon's glibc), configured from `.env`, no published ports.
- Named volume `db-data` mounted at `/var/lib/postgresql/data`.
- Database health check: `pg_isready -h 127.0.0.1`. The explicit TCP host matters because the postgres image first runs a temporary Unix-socket-only server during initialization; a socket check would report ready too early.
- `sslmode=disable` is used only inside the private Compose network. Production against Neon must use `sslmode=require`.

`docker compose down` must preserve the named database volume. `docker compose down -v` intentionally deletes it.

## Render + Neon
Render builds from the repository Dockerfile. Configure the service to use the Docker runtime and a health check on the health endpoint. Supply Neon connection information through environment variables.

Do not use Render Free PostgreSQL or a Render persistent disk for this architecture. Render's application filesystem is ephemeral; never store durable user data there.

Free plans and quotas change, and free web services may be slow to respond after idle periods. Recheck provider documentation at deployment time and do not hard-code current quota or behavior assumptions into application logic.

## Portability and backup
Self-hosting must require configuration and data migration, not code changes:
1. Provision Linux and Docker Compose.
2. Configure environment variables.
3. Start PostgreSQL with a named volume.
4. Restore a PostgreSQL dump.
5. Start the same app image.
6. Put Caddy in front for TLS and reverse proxy.
7. Add MinIO only if object storage is needed.

Document `pg_dump` and restore commands and test them periodically.

## Storage abstraction
For v1, use repository-managed static assets. If uploads are added, define an application-level object-storage interface and implement an S3-compatible adapter. MinIO is a possible self-hosted implementation. Do not couple application code to one vendor's SDK or URL scheme.

## Security
- Single administrator; no public registration.
- Secure password hashing.
- Server-side sessions.
- HttpOnly cookies; Secure in production; appropriate SameSite.
- Login rate limiting.
- Validate inputs at API boundaries, in Go.
- Server-side authorization for every admin action.
- CSRF protection where applicable.
- Never return drafts or private admin data publicly.
- Do not log secrets or session tokens.

## CI
`.github/workflows/ci.yml` runs:
- `foundation`: required documentation and templates are present.
- `frontend`: `npm ci`, typecheck, Vitest, `vite build` on Node.js 26.
- `go`: `gofmt` check, `go vet`, `go test -race`, `go build`.
- `integration`: builds the React app, starts the Go server and checks `/api/health`, JSON API 404, SPA fallback and that a missing asset is a 404.
- `docker`: builds the production image, checks it is configured as non-root, runs the container, repeats the smoke checks against it and checks graceful shutdown.

- `go` also runs a `postgres:17` service container and sets `TEST_DATABASE_URL`, so the pool is tested against a real database.
- `compose`: starts the Compose stack and checks health, that the React app is served, that the database port is not published, that data survives a database restart and the removal and recreation of containers, that `/api/health` returns 503 while the database is stopped and recovers afterwards, and that the app stops with exit code 0.

Still disabled and to be enabled phase by phase: lint and Goose migration tests. Package scripts and tools are not assumed until they exist.

Pin third-party actions to reviewed immutable commit SHAs before treating the workflow as production-hardened.
