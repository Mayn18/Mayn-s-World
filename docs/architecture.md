# Architecture — Mayn's World

> Status: target architecture. The application skeleton exists: a React frontend and a Go backend with `GET /api/health`, served from one origin. The database, Docker and everything else marked "planned" below do not exist yet.

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
- Database (planned): PostgreSQL 17, accessed with `pgx`.
- Migrations (planned): Goose, as SQL files in `migrations/`.
- Dockerfile + Docker Compose (planned).
- Render Free web service + Neon Free PostgreSQL initially.
- GitHub Actions for CI.
- Caddy and optional MinIO for future self-hosting.

## Runtime topology
Browser -> Render Docker web service -> Go server.
The Go server serves the built React app and `/api/*` from one origin.
Go server -> Neon PostgreSQL using `DATABASE_URL` (planned).

Local topology, current: two processes. The Go server listens on `:8080`. The Vite dev server listens on `:5173`, serves the React app with hot reload and proxies `/api/*` to Go. The browser only talks to `:5173`, so it sees one origin and no CORS configuration is needed.

Local topology, planned: Browser -> app container -> PostgreSQL container on a private Compose network.

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

Planned (adapt names as needed, but keep these responsibilities):

- `src/client/world`: theme registry, scenes, ambient effects and world manager.
- `src/client/components/pixel-ui`: reusable pixel-art UI.
- `src/client/components/navigation`: destination interactions and map.
- `src/client/pages`: public and admin pages.
- `internal/db`: PostgreSQL connection pool and queries (`pgx`).
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

## Database and migrations (planned)
Use standard PostgreSQL features through `pgx` (`pgxpool` for the connection pool). Goose SQL migrations in `migrations/` are the source of truth. Do not use automatic schema synchronization against production as a migration strategy.

Use a connection pool with sensible limits. Neon pooled connection strings may be used for application traffic; a direct connection may be used for migration tooling if required. Keep migration behavior documented and repeatable.

When the Neon project is created, confirm it uses PostgreSQL 17 so local, CI and production versions match. Do not assume a provider default.

## Environment variables
Implemented:
- `PORT`: listen port, default `8080`.
- `STATIC_DIR`: folder with the built React app, default `dist/client`.

Planned, at minimum:
- `DATABASE_URL`
- `SESSION_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`

Optional, planned:
- `DIRECT_DATABASE_URL`
- `GITHUB_TOKEN`

Use `.env.example` with placeholder values only. Production secrets belong in Render environment settings. Never bake secrets into an image.

## Docker (planned)
Dockerfile:
- Multi-stage: a Node.js 26 LTS stage runs `npm ci` and `npm run build`; a Go stage compiles the server (static binary); the final stage holds only the binary and `dist/client`. Node.js is not in the final image.
- Toolchain versions pinned consistently.
- Reproducible install from lockfiles (`package-lock.json`, `go.mod`).
- Lean production image, non-root runtime user.
- Listen on `0.0.0.0` and `PORT`.
- Health endpoint. The implemented endpoint is `GET /api/health`; docs and the Render health check previously said `/health`. Decide the platform health-check path in the Docker task (for example, point Render at `/api/health`, or add a root alias).
- Graceful shutdown (already implemented in the Go server).
- No secrets in image.

Compose:
- App service.
- PostgreSQL 17 service.
- Named database volume.
- Health check and app dependency on healthy DB.
- Local-only development configuration.

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

Still disabled and to be enabled phase by phase: lint, PostgreSQL migration tests, Docker build. Package scripts and tools are not assumed until they exist.

Pin third-party actions to reviewed immutable commit SHAs before treating the workflow as production-hardened.
