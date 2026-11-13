import { useEffect, useState } from 'react';
import { fetchHealth } from '../api/health';

// A request is in exactly one of these states. Modelling it as one value
// (instead of separate loading/error booleans) makes impossible combinations,
// like "loading and failed", impossible to represent.
type ApiStatus =
  | { kind: 'loading' }
  | { kind: 'ok' }
  | { kind: 'error'; message: string };

export function App() {
  const [status, setStatus] = useState<ApiStatus>({ kind: 'loading' });

  useEffect(() => {
    // Cancel the request if the component unmounts (or StrictMode re-runs this
    // effect in development), so a late response cannot update stale state.
    const controller = new AbortController();

    fetchHealth(fetch, controller.signal)
      .then(() => setStatus({ kind: 'ok' }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setStatus({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      });

    return () => controller.abort();
  }, []);

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-3xl font-bold">Mayn&apos;s World</h1>
      <p className="mt-4">
        {/* aria-live announces the result to screen readers when it arrives. */}
        <span role="status" aria-live="polite">
          {status.kind === 'loading' && 'Checking the server…'}
          {status.kind === 'ok' && 'Server status: ok'}
          {status.kind === 'error' && `Server unreachable: ${status.message}`}
        </span>
      </p>
    </main>
  );
}
