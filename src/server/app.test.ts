import { describe, expect, it } from 'vitest';
import { isHealthResponse } from '../shared/health.js';
import { app } from './app.js';

describe('GET /api/health', () => {
  it('returns 200 with { status: "ok" }', async () => {
    const res = await app.request('/api/health');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('returns a body that matches the shared contract', async () => {
    const res = await app.request('/api/health');

    expect(isHealthResponse(await res.json())).toBe(true);
  });
});

describe('unknown API paths', () => {
  it('returns a JSON 404 instead of falling through', async () => {
    const res = await app.request('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not_found' });
  });
});
