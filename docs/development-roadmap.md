# Development Roadmap — Mayn's World

Phases are listed in implementation order. Only Phase 0 is in progress.

## Phase 0 — Governance and design approval (in progress)
- Confirm requirements, architecture and visual design.
- Add `CLAUDE.md`, GitHub templates and a CI skeleton.
- Establish protected `main`, branch naming and CI expectations.
- No application implementation until documents are approved.

Acceptance: the foundation pull request is reviewed and approved by the owner; `main` is protected; the foundation CI check passes.

## Phase 1 — Technical foundation
- React, TypeScript and Vite.
- Hono on Node.js.
- Single-origin frontend/API serving.
- Dockerfile and Docker Compose.
- PostgreSQL 17 and health endpoint.
- Basic CI: install, typecheck, lint, test, build, Docker build.

Acceptance: clean local Docker startup and production image startup.

## Phase 2 — Data foundation
- Drizzle schema and migrations.
- Admin identity/session foundation.
- Projects and blog data models.
- Contact submission and analytics models.
- Migration tests against PostgreSQL.

Acceptance: migrations can be applied to an empty database and backed up/restored.

## Phase 3 — Exploration prototype
- One polished environment.
- Clickable destinations.
- Map/destination index.
- Keyboard and touch navigation.
- Accessible labels and focus states.
- Responsive behavior.

Acceptance: visitors can reach every core destination without avatar movement.

## Phase 4 — Pixel UI and theme engine
- Reusable pixel-art UI components.
- Centralized theme registry.
- Implement and polish the first theme.
- Add remaining themes progressively.
- Theme persistence and crossfade.

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
