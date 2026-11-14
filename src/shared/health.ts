// The contract for GET /api/health. Both the server (which sends it) and the
// client (which reads it) import this file, so the two sides cannot silently
// disagree about the response shape.

export interface HealthResponse {
  status: 'ok';
}

// Data from the network is untyped at runtime, whatever TypeScript says.
// The client uses this guard to check the shape instead of trusting a cast.
export function isHealthResponse(value: unknown): value is HealthResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { status?: unknown }).status === 'ok'
  );
}
