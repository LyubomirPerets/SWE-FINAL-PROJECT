-- 004: turn on Row Level Security for every table in the public schema.
--
-- Supabase exposes each public table through its auto-generated REST API (PostgREST).
-- Anyone holding the project's public "anon" key can call that API. With RLS off,
-- that means reading users.password_hash and the "session" table (live session IDs).
--
-- With RLS on and no policies, the anon and authenticated roles see nothing.
-- Our backend connects as the table owner (postgres on Supabase, crm locally),
-- and owners bypass RLS, so the app keeps working unchanged.
--
-- Every new table needs RLS too. tests/rls.test.ts fails if a public table lacks it,
-- so add `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;` to the migration that creates it.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END
$$;
