// The contract for GET /api/health, served by the Go backend
// (internal/handlers/api.go). The shape is declared on both sides, and the
// tests on each side pin it, so a change to one without the other fails a test.
export interface HealthResponse {
  status: 'ok';
}

// Data from the network is untyped at runtime, whatever TypeScript says.
// This guard checks the shape instead of trusting a cast.
export function isHealthResponse(value: unknown): value is HealthResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { status?: unknown }).status === 'ok'
  );
}

// All calls use a relative URL. In development Vite proxies it to the Go
// server; in production Go serves both the page and the API from one origin.
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
