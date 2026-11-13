# Architecture Decision Records — Mayn's World

Each record states the decision, the reason and the main trade-off accepted.

## ADR-001 — Render + Neon initially, self-hostable later
**Status:** Accepted

Use Render Free for the Dockerized application and Neon Free for managed PostgreSQL. Keep the application provider-neutral and use standard Node.js and PostgreSQL. Future self-hosting uses Linux, Docker Compose, PostgreSQL, Caddy and optional MinIO.

Reason: free initial hosting with a practical migration path.

Trade-off: free tiers have quotas and limits that change, and free web services may respond slowly after idle periods. Accepted for a personal site; recheck provider terms at deployment time.

## ADR-002 — Docker is the deployment boundary
**Status:** Accepted

Use a multi-stage Dockerfile for the production app and Docker Compose for local development. The same app image should run on Render and a future Linux host.

Trade-off: adds Docker as a required local tool in exchange for identical behavior across environments.

## ADR-003 — One application service for v1
**Status:** Accepted

Hono serves the built React app and `/api/*` from one origin. Avoid separate frontend/backend deployments initially to reduce operational complexity and CORS configuration.

Trade-off: frontend and backend deploy together and cannot scale independently. Irrelevant at this scale.

## ADR-004 — PostgreSQL is the durable data store
**Status:** Accepted

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
