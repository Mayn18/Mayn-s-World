# Product Requirements — Mayn's World

## Product vision
A personal website presented as a cozy, explorable pixel-art world. It should feel distinctive and inviting while remaining useful to developers, recruiters and general visitors. It is not a conventional developer portfolio.

## Audiences and primary tasks
Visitors should be able to:
- Understand who the site owner is.
- Browse projects and open their source repositories.
- Read articles and development notes.
- View or download a resume.
- Contact the site owner.
- Find GitHub information.
- Navigate directly to any destination without completing a game.

## Functional requirements

### Public experience
Required sections:
1. Home / introduction.
2. About.
3. Projects list and project detail pages.
4. Blog list and article pages.
5. Resume page and PDF download.
6. Contact form.
7. GitHub/repository showcase.

The home environment is the primary navigation interface. A map/destination index and accessible fallback navigation must always be available.

### Admin experience
Single administrator only:
- Secure login and logout.
- Dashboard overview.
- Create, edit, publish, unpublish and delete projects.
- Create, edit, draft, publish and delete blog posts.
- Edit profile/site settings.
- View contact submissions and mark their status.
- View basic privacy-conscious analytics.
- Manage resume metadata and replace the resume asset through a safe deployment or future object-storage workflow.

No public account registration.

### Content behavior
- Blog body stored as Markdown.
- Posts have unique slugs, title, summary, status, publication date and metadata.
- Draft posts are private and never returned by public endpoints.
- Projects support GitHub and non-GitHub work.
- Project records include title, description, status, technologies, links, images and display order.
- Resume must have a human-readable web presentation or page as well as a PDF download.
- Contact form submissions persist in PostgreSQL. Email delivery is not required for v1.

### GitHub integration
- GitHub data is optional and must degrade gracefully.
- Cache API responses in PostgreSQL.
- Do not make a live GitHub API request for every page view.
- Do not expose a private token to the browser.
- Public repository links remain usable if the API integration is unavailable.

### Analytics
Basic, privacy-conscious analytics:
- Page views.
- Popular pages/projects/articles.
- Visitor trends over time.

Avoid invasive fingerprinting. Document what is collected and provide a privacy notice where appropriate.

## Non-functional requirements

### Security
- Single administrator; no public registration.
- Secure password hashing and server-side sessions.
- HttpOnly cookies; Secure in production; appropriate SameSite policy.
- Rate-limit login and validate all API inputs.
- Enforce authorization server-side for every admin operation.
- Protect cookie-authenticated state-changing operations against CSRF as appropriate.
- Public APIs never return drafts or admin-only data.
- Secrets live in environment variables, are never committed and are never logged.

### Accessibility
See `docs/visual-design.md`. Core destinations work with mouse, keyboard and touch; reduced-motion and avatar settings are honored; all content remains reachable if scene rendering fails.

### Performance
Keep first load lightweight and usable on modest hardware. Avoid unnecessary continuous animation, and pause or reduce ambient effects when the page is hidden.

### Portability and persistence
- Standard Node.js and PostgreSQL interfaces only; no provider-specific runtime APIs.
- Durable data lives in PostgreSQL (or a future S3-compatible store), never the application container filesystem.
- Moving from Render + Neon to self-hosted Linux requires configuration and a data restore, not code changes.

### Maintainability
- Prefer understandable code over clever abstractions.
- Keep world-rendering code separate from API, authentication and database code.
- The owner must be able to understand, debug and maintain the whole application.

### Privacy
Analytics collect only what is documented. No fingerprinting. Contact form contents are never written to logs.

## Free-first constraints
- No paid API or paid SaaS dependency required for core operation.
- Initial deployment uses Render Free and Neon Free.
- No paid domain requirement; use the provided host subdomain initially.
- No required outbound email service.
- No persistent uploads to Render's filesystem.
- The application must run locally with Docker Compose.

## Version-one exclusions
- Public user accounts.
- Comments, likes or social feeds.
- Multiplayer.
- RPG combat, inventory, stats, quests or complex movement.
- Mandatory email delivery.
- Paid analytics or APIs.
- Kubernetes or microservices.
- Mandatory object storage.

## Visual requirements
See `docs/visual-design.md`. Exploration-based navigation, optional avatar, six-theme architecture and one polished initial world are mandatory.

## Acceptance criteria
- Local startup with `docker compose up --build`.
- Production Docker image builds and runs.
- Deployment to Render Free connects to Neon PostgreSQL.
- Content and admin data persist across app redeployments.
- Public APIs never expose drafts or admin-only data.
- Core destinations work with mouse, keyboard and touch.
- Reduced-motion and avatar settings work.
- Site remains useful if ambient effects fail.
- Database can be exported and restored into local PostgreSQL.
- CI runs tests, lint, typecheck, build and Docker build as configured.
