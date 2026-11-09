import { afterAll, describe, expect, it } from 'vitest';
import { closePool, pool } from '../src/db/pool.js';

afterAll(async () => {
  await closePool();
});

// Supabase exposes every public table through its REST API using the public anon key.
// RLS with no policies blocks that path. The backend connects as the table owner, so it isn't affected.
describe('row level security', () => {
  it('is enabled on every table in the public schema', async () => {
    const { rows } = await pool.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity ORDER BY tablename",
    );
    expect(
      rows.map((r) => r.tablename),
      'Add `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;` to the migration that creates these tables',
    ).toEqual([]);
  });
});
