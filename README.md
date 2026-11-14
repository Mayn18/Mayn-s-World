# Mayn's World

A personal website and interactive hub, presented as a cozy, explorable pixel-art world instead of a conventional portfolio. Visitors find the home page, about page, projects, blog, resume, GitHub activity and contact form by exploring the environment. A map and standard navigation are always available, and the optional avatar can be turned off.

The visual direction is inspired by my earlier project, [Beep-Bot](https://github.com/Mayn18/Beep-Bot).

## Status

Phase 1, in progress. The repository contains documentation, GitHub templates and a working application skeleton: a React page that calls a Go `GET /api/health` endpoint, with the Go server also able to serve the built React app from one origin. A multi-stage Dockerfile builds the production image. There is no database, Docker Compose setup or website content yet, and nothing is deployed.

## Technology

- Frontend: React, TypeScript, Vite, Tailwind CSS (Motion planned)
- Backend: Go, standard library `net/http` only
- Node.js 26 LTS and npm: frontend tooling and builds only, not the production backend
- Tests: Vitest (frontend), Go `testing` + `httptest` (backend)
- Packaging: multi-stage Docker image (Node build stage, Go build stage, distroless non-root runtime)
- Planned: PostgreSQL 17 with `pgx` and Goose migrations, Docker Compose
- Initial hosting: Render Free and Neon Free, with a path to self-hosting on Linux

## Repository structure

```
cmd/server/        Go program entry point (startup, graceful shutdown)
internal/config/   environment configuration (PORT, STATIC_DIR)
internal/handlers/ HTTP handlers, JSON helpers, React app file server
internal/server/   routes, middleware, http.Server timeouts
src/client/        React app (app/, api/, main.tsx, styles.css)
index.html         Vite entry page
vite.config.ts     Vite, Tailwind, test and dev-proxy configuration
Dockerfile         production image: builds the React app and the Go binary
.dockerignore      keeps secrets and build output out of the Docker build context
docs/              requirements, architecture, design, roadmap, decisions
```

## Running it locally

Requires Node.js 26 (see `.nvmrc`) and Go 1.27 or newer.

**Development** (two terminals; the browser uses Vite on port 5173):

```bash
npm install                # once
go run ./cmd/server        # terminal 1: Go API on http://localhost:8080
npm run dev:client         # terminal 2: React on http://localhost:5173
```

Open http://localhost:5173. The page shows "Server status: ok" when it can reach Go. Stop the Go server and reload to see the error state.

**Production-like** (one process, one origin):

```bash
npm run build              # React app -> dist/client
go run ./cmd/server        # serves the app and the API on http://localhost:8080
```

Run commands from the repository root: the server looks for `dist/client` relative to the working directory.

**In Docker** (requires Docker; no Node.js or Go needed on your machine):

```bash
docker build -t mayn-s-world .
docker run --rm -p 8080:8080 mayn-s-world   # app and API on http://localhost:8080
```

### Configuration

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `8080` | Port to listen on. The server always binds `0.0.0.0`. |
| `STATIC_DIR` | `dist/client` | Folder containing the built React app. |

### How React talks to Go

The frontend calls relative URLs like `fetch('/api/health')`. In development, Vite (port 5173) forwards `/api/*` to Go (port 8080), so the browser sees one origin and no CORS setup is needed. In production, the Go server delivers both the page and the API itself. See [Architecture](docs/architecture.md) and ADR-013.

### Tests and checks

```bash
# Backend
gofmt -l .                 # must print nothing
go vet ./...
go test ./...

# Frontend
npm run typecheck
npm test
npm run build
```

## Documentation

- [Requirements](docs/requirements.md)
- [Architecture](docs/architecture.md)
- [Visual design](docs/visual-design.md)
- [Development roadmap](docs/development-roadmap.md)
- [Decisions](docs/decisions.md)
- [Claude working instructions](CLAUDE.md)

## Development approach

Work proceeds one roadmap phase at a time on feature branches, through pull requests that need human approval before merging. I am building this to understand and maintain it, so AI assistance is used for approved milestones, reviews and hints, and its contributions are not disguised.

## License

[MIT](LICENSE)
