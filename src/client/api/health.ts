// The contract for GET /api/health, served by the Go backend
// (internal/handlers/api.go). The shape is declared on both sides, and the
// tests on each side pin it, so a change to one without the other fails a test.
//
// `database` is present only when the server has a database configured. A
// failing database is HTTP 503 with {"status":"unavailable","database":
// "unavailable"}; fetchHealth treats any non-2xx status as an error before it
// looks at the body, so that shape never reaches this type.
export interface HealthResponse {
  status: 'ok';
  database?: 'ok';
}

// Data from the network is untyped at runtime, whatever TypeScript says.
// This guard checks the shape instead of trusting a cast.
export function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { status, database } = value as { status?: unknown; database?: unknown };
  return status === 'ok' && (database === undefined || database === 'ok');
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
