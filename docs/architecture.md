# Architecture — Mayn's World

> Status: target architecture. Only the application skeleton exists so far (React, Hono, `GET /api/health`); the database, Docker and everything else below are still planned.

## Principles
1. Docker-first and provider-portable.
2. One deployable application service for v1.
3. Standard Node.js and PostgreSQL interfaces.
4. Persistent data never lives in the application container filesystem.
5. Semantic HTML and accessible DOM for content and controls.
6. Clear separation between visual world, website features, API and data access.

## Stack
- React + TypeScript + Vite.
- Tailwind CSS + custom CSS.
- Motion for selected interface animations.
- Hono on standard Node.js.
- Node.js 26 LTS.
- PostgreSQL 17.
- Drizzle ORM and migrations.
- Dockerfile + Docker Compose.
- Render Free web service + Neon Free PostgreSQL initially.
- GitHub Actions for CI.
- Caddy and optional MinIO for future self-hosting.

## Runtime topology
Browser -> Render Docker web service -> Hono application.
Hono serves the built React app and `/api/*` from one origin.
Hono -> Neon PostgreSQL using `DATABASE_URL`.

Local topology:
Browser -> app container -> PostgreSQL container on a private Compose network.

Future self-hosted topology:
Internet -> Caddy -> app container -> PostgreSQL container.
Optional MinIO provides S3-compatible object storage.

## Suggested source boundaries
Adapt names to the repository, but preserve these responsibilities:

- `src/client/app`: application entry and routing.
- `src/client/world`: theme registry, scenes, ambient effects and world manager.
- `src/client/components/pixel-ui`: reusable pixel-art UI.
- `src/client/components/navigation`: destination interactions and map.
- `src/client/pages`: public and admin pages.
- `src/server`: Hono app, routes, middleware and services.
- `src/db`: Drizzle schema, connection and repositories.
- `src/shared`: shared validation schemas and types.
- `public`: static assets.
- `migrations`: generated database migrations.

Do not put API, authentication or database logic in world-rendering modules.

## Database and migrations
Use standard PostgreSQL features. Drizzle migrations are the source of truth. Do not use production schema push/synchronization as a migration strategy.

Use a connection pool with sensible limits. Neon pooled connection strings may be used for application traffic; a direct connection may be used for migration tooling if required. Keep migration behavior documented and repeatable.

When the Neon project is created, confirm it uses PostgreSQL 17 so local, CI and production versions match. Do not assume a provider default.

## Environment variables
At minimum:
- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `SESSION_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD_HASH`

Optional:
- `DIRECT_DATABASE_URL`
- `GITHUB_TOKEN`

Use `.env.example` with placeholder values only. Production secrets belong in Render environment settings. Never bake secrets into an image.

## Docker
Dockerfile:
- Multi-stage.
- Node.js 26 LTS, version pinned consistently.
- Reproducible install from lockfile.
- Lean production image.
- Non-root runtime user.
- Listen on `0.0.0.0` and `PORT`.
- `/health` endpoint.
- Graceful shutdown.
- No secrets in image.

Compose:
- App service.
- PostgreSQL 17 service.
- Named database volume.
- Health check and app dependency on healthy DB.
- Local-only development configuration.

`docker compose down` must preserve the named database volume. `docker compose down -v` intentionally deletes it.

## Render + Neon
Render builds from the repository Dockerfile. Configure the service to use the Docker runtime and `/health` health check. Supply Neon connection information through environment variables.

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
- Validate inputs at API boundaries.
- Server-side authorization for every admin action.
- CSRF protection where applicable.
- Never return drafts or private admin data publicly.
- Do not log secrets or session tokens.

## CI
GitHub Actions should eventually run dependency installation, typecheck, lint, tests, production build, Docker build and migration tests.

Current state: `.github/workflows/ci.yml` runs a foundation check (required documentation and templates are present) and an `app` job (`npm ci`, typecheck, test, build). Lint, PostgreSQL migration tests and the Docker build are still disabled and must be enabled phase by phase as the matching scripts and files are created. Package scripts are not assumed until they exist.

Pin third-party actions to reviewed immutable commit SHAs before treating the workflow as production-hardened.
