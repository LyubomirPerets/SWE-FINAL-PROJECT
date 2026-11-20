import { afterAll, describe, expect, it } from 'vitest';
import { assertLocalDatabase } from '../src/db/migrate.js';
import { closePool } from '../src/db/pool.js';

afterAll(async () => {
  await closePool();
});

// resetDatabase() (used by `npm run db:reset` and the test setup) drops every table,
// so it must refuse anything that isn't a local database.
describe('assertLocalDatabase', () => {
  it.each([
    'postgres://crm:crm@localhost:5432/crm',
    'postgres://crm:crm@localhost:5432/crm_test',
    'postgres://crm:crm@127.0.0.1:5433/crm_test',
    'postgres://crm:crm@[::1]:5432/crm',
  ])('allows %s', (url) => {
    expect(() => assertLocalDatabase(url)).not.toThrow();
  });

  it.each([
    'postgresql://postgres.abc:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres',
    'postgres://crm:crm@db.example.com:5432/crm_test',
    'postgres://crm:crm@localhost.example.com:5432/crm',
  ])('refuses %s', (url) => {
    expect(() => assertLocalDatabase(url)).toThrow(/Refusing to reset/);
  });

  it('refuses a value that is not a URL', () => {
    expect(() => assertLocalDatabase('not a url')).toThrow(/not a valid URL/);
  });

  it("doesn't print the password in the error", () => {
    const url = 'postgresql://postgres.abc:hunter2@aws-0-us-east-1.pooler.supabase.com:5432/db';
    expect(() => assertLocalDatabase(url)).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining('hunter2') }),
    );
  });
});
