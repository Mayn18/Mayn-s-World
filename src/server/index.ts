import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { app } from './app.js';

// Serve the built React app from the same origin as the API (ADR-003).
// Paths are relative to the working directory, so run from the repo root.
// If dist/client does not exist (for example during `npm run dev:server`),
// these handlers find no file and the request falls through to a 404.
// The order matters: the /api routes in app.ts are registered first and win.
app.use('/*', serveStatic({ root: './dist/client' }));
// Unknown non-API paths get index.html so client-side routing can work later.
app.get('*', serveStatic({ path: './dist/client/index.html' }));

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

// 0.0.0.0 so the server is reachable from outside a container later.
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(`Server listening on http://localhost:${info.port}`);
});
