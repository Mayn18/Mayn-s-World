import { describe, expect, it } from 'vitest';
import { fetchHealth } from './health';

// Builds a fake fetch that always answers with the given JSON and status.
function fakeFetch(body: unknown, status = 200): typeof fetch {
  return async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    });
}

describe('fetchHealth', () => {
  it('resolves with the body when the server says ok', async () => {
    await expect(fetchHealth(fakeFetch({ status: 'ok' }))).resolves.toEqual({
      status: 'ok',
    });
  });

  it('accepts the body the server sends when a database is connected', async () => {
    await expect(
      fetchHealth(fakeFetch({ status: 'ok', database: 'ok' })),
    ).resolves.toEqual({ status: 'ok', database: 'ok' });
  });

  it('rejects the 503 the server sends when the database is down', async () => {
    const down = { status: 'unavailable', database: 'unavailable' };
    await expect(fetchHealth(fakeFetch(down, 503))).rejects.toThrow('HTTP 503');
  });

  it('rejects an ok status that carries an unexpected database value', async () => {
    await expect(
      fetchHealth(fakeFetch({ status: 'ok', database: 'unavailable' })),
    ).rejects.toThrow('unexpected response shape');
  });

  it('rejects when the server returns an error status', async () => {
    await expect(fetchHealth(fakeFetch({ error: 'boom' }, 500))).rejects.toThrow(
      'HTTP 500',
    );
  });

  it('rejects when the body does not match the contract', async () => {
    await expect(fetchHealth(fakeFetch({ status: 'degraded' }))).rejects.toThrow(
      'unexpected response shape',
    );
  });

  it('calls the relative /api/health URL', async () => {
    let requestedUrl: unknown;
    const spy: typeof fetch = async (input) => {
      requestedUrl = input;
      return new Response(JSON.stringify({ status: 'ok' }));
    };

    await fetchHealth(spy);

    expect(requestedUrl).toBe('/api/health');
  });
});
