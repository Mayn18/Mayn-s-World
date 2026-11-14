import { Hono } from 'hono';
import type { HealthResponse } from '../shared/health.js';

// The app is created here but not started here. Starting a listener lives in
// index.ts, so tests can call the app directly with app.request() without
// opening a network port.
export const app = new Hono();

app.get('/api/health', (c) => {
  const body: HealthResponse = { status: 'ok' };
  return c.json(body);
});

// Any other /api path gets a JSON 404. Without this, the single-page-app
// fallback in index.ts would answer unknown API paths with index.html,
// which is confusing for API callers.
app.all('/api/*', (c) => c.json({ error: 'not_found' }, 404));
