import { describe, it } from 'vitest';

// TODO(James): unit tests for src/middleware/error.ts. No database or server is needed.
// Call errorHandler(err, req, res, next) directly with a fake res, the same way
// tests/middleware.test.ts tests requireAuth and requireRole.
// Change each `it.todo` to `it` and add a body.
describe('errorHandler', () => {
  // Build a ZodError, e.g. with z.object({ a: z.string() }).safeParse({}).error.
  // Expect 400 { error: 'Validation failed', details: { a: [...] } }.
  it.todo('turns a ZodError into 400 with field details');

  // An error with { status: 400 } → 400 { error: 'Malformed request body' }.
  it.todo('maps status 400 to "Malformed request body"');

  // An error with { status: 413 } → 413 { error: 'Request body too large' }.
  it.todo('maps status 413 to "Request body too large"');

  // Any other 4xx, e.g. { status: 415 } → 415 { error: 'Bad request' }.
  it.todo('uses "Bad request" for other 4xx statuses');

  // new Error('db password is hunter2') → 500 { error: 'Internal server error' }.
  // The response must NOT contain the original message. Silence console.error with vi.spyOn.
  it.todo('returns a generic 500 without leaking the error message');

  // { status: 503 } and { status: '400' } (a string) are not client errors → 500.
  it.todo('treats non-4xx and non-numeric statuses as 500');
});

describe('notFound', () => {
  // Expect 404 { error: 'Not found' }.
  it.todo('returns 404 JSON');
});
