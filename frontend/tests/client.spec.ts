import { expect, test } from '@playwright/test';
import { advanceSessionVersion, ApiError, onUnauthorized, requestJson } from '../src/api/client';
import { getReturnTo } from '../src/lib/authNavigation';

const originalFetch = globalThis.fetch;
test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('JSON requests include credentials and accept an empty successful logout', async () => {
  let options: RequestInit | undefined;
  globalThis.fetch = async (_input, init) => {
    options = init;
    return new Response(null, { status: 204 });
  };
  await expect(requestJson<void>('/api/auth/logout', { method: 'POST' })).resolves.toBeUndefined();
  expect(options?.credentials).toBe('include');
});

test('validation details survive the API boundary', async () => {
  globalThis.fetch = async () =>
    Response.json(
      {
        error: 'Validation failed',
        details: { email: ['Invalid email'], invalid: 12 },
      },
      { status: 400 },
    );
  await expect(requestJson('/api/auth/signup')).rejects.toMatchObject({
    status: 400,
    message: 'Validation failed',
    details: { email: ['Invalid email'] },
  });
});

test('only protected-request 401s expire authentication, not login errors or forbidden responses', async () => {
  let expired = 0;
  const unsubscribe = onUnauthorized(() => {
    expired += 1;
  });
  try {
    globalThis.fetch = async () =>
      Response.json({ error: 'Invalid email or password' }, { status: 401 });
    await expect(requestJson('/api/auth/login', { auth: 'optional' })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(expired).toBe(0);
    globalThis.fetch = async () => Response.json({ error: 'Forbidden' }, { status: 403 });
    await expect(requestJson('/api/protected')).rejects.toMatchObject({ status: 403 });
    expect(expired).toBe(0);
    globalThis.fetch = async () =>
      Response.json({ error: 'Authentication required' }, { status: 401 });
    await expect(requestJson('/api/protected')).rejects.toMatchObject({ status: 401 });
    expect(expired).toBe(1);
  } finally {
    unsubscribe();
  }
});

test('a late unauthorized response from a previous session cannot log out a new session', async () => {
  let complete!: (response: Response) => void;
  let expired = false;
  globalThis.fetch = () =>
    new Promise<Response>((resolve) => {
      complete = resolve;
    });
  const unsubscribe = onUnauthorized(() => {
    expired = true;
  });
  try {
    const pending = requestJson('/api/protected');
    advanceSessionVersion();
    complete(Response.json({ error: 'Authentication required' }, { status: 401 }));
    await expect(pending).rejects.toMatchObject({ status: 401 });
    expect(expired).toBe(false);
  } finally {
    unsubscribe();
  }
});

test('return URLs cannot redirect to external sites or unsupported routes', () => {
  for (const next of [
    'https://example.com',
    '//example.com',
    '/\\example.com',
    '/login',
    '/dashboard/../login',
  ]) {
    expect(getReturnTo(`?next=${encodeURIComponent(next)}`)).toBe('/dashboard');
  }
  expect(getReturnTo('?next=%2Fdashboard%3Fview%3Daccount%23details')).toBe(
    '/dashboard?view=account#details',
  );
});
