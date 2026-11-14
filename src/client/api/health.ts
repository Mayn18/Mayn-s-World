import { isHealthResponse, type HealthResponse } from '../../shared/health.js';

// All calls use a relative URL. In development Vite proxies it to Hono; in
// production Hono serves both the page and the API from one origin.
//
// fetchImpl is a parameter only so tests can pass a fake instead of a real
// network call. Normal code calls fetchHealth() with no arguments.
export async function fetchHealth(
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<HealthResponse> {
  const response = await fetchImpl('/api/health', { signal });

  if (!response.ok) {
    throw new Error(`Health check failed with HTTP ${response.status}`);
  }

  const body: unknown = await response.json();
  if (!isHealthResponse(body)) {
    throw new Error('Health check returned an unexpected response shape');
  }
  return body;
}
