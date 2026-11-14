# Mayn's World — Claude Project Instructions

## Project mission
Build a full-stack personal website that feels like an explorable, cozy pixel-art world rather than a conventional portfolio. Visitors discover About, Projects, Blog, Resume, Contact and GitHub destinations by interacting with the environment.

The visual reference is the owner's repository: https://github.com/Mayn18/Beep-Bot
Use its design philosophy (multiple themed worlds, pixel-art atmosphere, ambient effects, reusable UI skins and saved preferences) as inspiration. Do not copy its code or assets without checking their licenses.

## Current status
Phase 1 (technical foundation). The React + TypeScript + Vite frontend and the Go (`net/http`) backend exist, with `GET /api/health` and single-origin serving. No database, Docker, authentication or website features exist yet. The backend moved from Hono to Go in ADR-013. See `docs/development-roadmap.md`.

## Commands (these exist; nothing else should be assumed)
Backend (Go):
- `go run ./cmd/server` starts the server on port 8080 (`PORT`, `STATIC_DIR` override defaults).
- `go test ./...`, `go vet ./...`, `gofmt -l .` (must print nothing), `go build ./...`.

Frontend (Node.js 26, npm):
- `npm run dev:client` starts Vite on port 5173 and proxies `/api` to Go on port 8080. Run it alongside the Go server.
- `npm run typecheck`, `npm test` (Vitest), `npm run build` (writes `dist/client`, which the Go server serves).

No linter is configured yet for either language beyond `go vet`.

## Mandatory documents
Before making changes, read:
- `docs/requirements.md`
- `docs/architecture.md`
- `docs/visual-design.md`
- `docs/development-roadmap.md`
- `docs/decisions.md`

These documents are the source of truth. If they conflict, stop and explain the conflict rather than silently choosing.

## Working modes

### Documentation mode
When asked to prepare or revise project documentation:
- Inspect the repository and current docs first.
- Edit only the requested documentation and templates.
- Do not implement application features.
- Report changed files, unresolved questions and contradictions.

### Implementation mode
- Implement only the explicitly approved milestone or issue.
- Inspect relevant code before editing.
- Explain the proposed plan before substantial changes.
- Keep changes small and testable.
- Follow existing conventions unless they conflict with approved architecture.
- Run relevant tests, lint, typecheck and build commands.
- Review your own diff for security, accessibility, performance and maintainability.
- Do not silently expand scope.
- Do not generate an entire application in one operation.

### Human learning mode (default for user-owned issues)
The owner wants to understand and solve issues themselves.
- Do not edit files, generate patches, replace whole files, commit, push, merge or close issues.
- Explain the problem, relevant concepts and likely files.
- Give progressive hints; start with a small hint, then deepen only when asked.
- Ask the owner to explain their reasoning where useful.
- When the owner says they have finished, perform a read-only review.
- Point out problems and explain why; do not fix them unless explicitly asked.

The owner may explicitly authorize a complete implementation. That authorization applies only to the stated task.

### Review mode
Treat implementation as untrusted, including your own work.
- Review read-only unless explicitly authorized to edit.
- Verify findings against actual code and reproducible behavior.
- Distinguish introduced defects from pre-existing issues.
- Check security, data integrity, accessibility, responsiveness, performance, tests and portability.
- Do not create speculative, duplicate or style-only issues.
- For every proposed issue, include evidence, affected files, reproduction steps, expected/actual behavior and acceptance criteria.

## Architecture invariants
- Frontend: React + TypeScript + Vite, Tailwind CSS and custom CSS, Motion for animation.
- Backend: Go using only the standard library `net/http`. Do not introduce Gin, Echo, Fiber or other web frameworks (ADR-013).
- Node.js 26 LTS and npm are for frontend tooling and builds only; Node never runs the production backend. Pin toolchain versions consistently in project config and container.
- Database (planned): standard PostgreSQL 17 accessed with `pgx`.
- Migrations (planned): Goose SQL migrations are the source of truth; no production schema push.
- Local development: Docker Compose.
- Production packaging: multi-stage Dockerfile (Node build stage, Go build stage, minimal runtime image).
- Initial hosting: Render Free web service + Neon Free PostgreSQL.
- Future hosting: Linux + Docker Compose, PostgreSQL, Caddy, optional MinIO.
- One application service: the Go server serves the built React app and `/api/*` from the same origin.
- Use standard Go APIs and PostgreSQL. Do not introduce Cloudflare Workers, D1, Render-specific application APIs, proprietary runtime dependencies or provider-specific database features.
- All durable data belongs in PostgreSQL or a future S3-compatible object store, never the Render container filesystem.
- Use environment variables for deployment configuration and secrets. Never commit secrets.
- Keep world-rendering code free of API, authentication and database logic.

## Product and visual invariants
- Navigation is exploration-based: the environment itself is the primary navigation surface.
- Provide a visible map/destination index and accessible fallback navigation.
- Optional avatar only; never required for navigation or content.
- Start with one polished environment. Architect for six themes; do not build six incomplete scenes at once.
- Initial themes: Daytime Meadow, Cozy Night, Rainy Evening, Sunset Dream, Enchanted Forest, Snowy Cabin.
- Keep actual content in semantic, readable DOM elements. Do not build the whole site as one canvas.
- All interactive destinations must work with mouse, keyboard and touch.
- Support reduced motion, animation controls and avatar toggle.
- Pixel styling must not impair readability, contrast or accessibility.

## Coding conventions
- Prefer understandable code over unnecessary abstractions. Add an abstraction only when there is a concrete second use.
- TypeScript throughout the frontend; avoid `any` and explain any exception in a comment.
- Go: standard library first, `gofmt`-formatted, every error handled or deliberately ignored with a comment. Keep packages small and add one only when there is a concrete need.
- Comments explain why, not what.
- Keep modules small and single-purpose, following the source boundaries in `docs/architecture.md`.
- Validate all input at API boundaries, in Go. Response types are declared in Go and mirrored in `src/client/api`; tests on both sides pin the JSON.
- Explain important architectural decisions in the PR description and, when lasting, in `docs/decisions.md`.
- Package manager is npm; frontend tests use Vitest (ADR-012); backend tests use Go `testing` and `httptest` (ADR-013). A frontend linter and formatter are still to be chosen in Phase 1 and then documented here. Do not assume tools or package scripts that do not exist yet.

## Security requirements
- Single administrator; no public registration.
- Secure password hashing and server-side sessions.
- HttpOnly cookies; Secure in production; appropriate SameSite policy.
- Rate-limit login and validate all API inputs.
- Enforce authorization server-side for every admin operation.
- Protect cookie-authenticated state-changing operations against CSRF as appropriate.
- Draft content must never appear in public API responses.
- Do not log secrets, passwords, session tokens or sensitive form contents.

## Testing and quality gates
Before reporting completion:
- Run applicable tests.
- Run typecheck and lint if configured. For Go: `gofmt -l .`, `go vet ./...` and `go test ./...`.
- Run production build.
- Build the Docker image when Docker files are affected.
- Test migrations against PostgreSQL.
- State exactly what was and was not tested.
- Do not claim deployment, merge, issue creation or test success unless it actually happened.

## Git and issue workflow
- `main` is protected; work on a task-specific branch. Never push directly to `main`.
- Use pull requests and wait for CI before merging.
- Do not merge pull requests or deploy without human approval.
- For AI implementation, use a feature branch and open a PR if the available integration supports it; otherwise provide exact manual steps.
- The GitHub connector does not imply permission to modify every repository resource. Respect configured permissions.
- Owner issue branches use a name such as `fix/issue-001-short-description`.
- Do not close issues automatically.
- Create GitHub issues only for verified, reproducible problems, with evidence, affected files and acceptance criteria.
- Do not disguise AI contributions or manipulate commit attribution. The owner reviews and takes responsibility for the project.
- Claude-specific working prompts live in the private Claude Project, not in this repository. Do not add a `prompts/` folder.

## Scope discipline
Version one excludes public accounts, comments, multiplayer, RPG combat, inventory, quests, complex physics, mandatory email delivery, paid APIs, Kubernetes and mandatory object storage.

If a requested feature conflicts with the free-first or portable architecture, explain the trade-off and propose a compatible alternative before implementing it.
