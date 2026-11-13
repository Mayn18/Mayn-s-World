# Mayn's World

A personal website and interactive hub, presented as a cozy, explorable pixel-art world instead of a conventional portfolio. Visitors find the home page, about page, projects, blog, resume, GitHub activity and contact form by exploring the environment. A map and standard navigation are always available, and the optional avatar can be turned off.

The visual direction is inspired by my earlier project, [Beep-Bot](https://github.com/Mayn18/Beep-Bot).

## Status

Planning. This repository currently contains documentation and GitHub project templates only. There is no application code yet, and nothing is deployed.

## Planned technology

- Frontend: React, TypeScript, Vite, Tailwind CSS, Motion
- Backend: Hono on Node.js 24 LTS
- Database: PostgreSQL 17 with Drizzle ORM
- Packaging: multi-stage Docker image; Docker Compose for local development
- Initial hosting: Render Free and Neon Free, with a path to self-hosting on Linux

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
