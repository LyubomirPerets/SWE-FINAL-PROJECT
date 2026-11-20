import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';
import { pool, closePool } from './pool.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Throws unless `databaseUrl` points at this machine. resetDatabase() drops every table,
 * so it must never run against the shared Supabase database, whichever .env line or
 * missing TEST_DATABASE_URL sent it there.
 */
export function assertLocalDatabase(databaseUrl: string): void {
  let host: string;
  try {
    host = new URL(databaseUrl).hostname;
  } catch {
    throw new Error('Refusing to reset the database: DATABASE_URL is not a valid URL.');
  }
  if (!LOCAL_HOSTS.has(host)) {
    throw new Error(
      `Refusing to reset the database at "${host}": reset drops every table, so it only ` +
        'runs against a local database (localhost). For `npm test`, set TEST_DATABASE_URL ' +
        'to your local crm_test database. For `npm run db:reset`, point DATABASE_URL at ' +
        'local Docker.',
    );
  }
}

export async function resetDatabase(): Promise<void> {
  assertLocalDatabase(config.DATABASE_URL);
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
}

export async function migrate(): Promise<void> {
  await pool.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())',
  );
  const applied = new Set(
    (await pool.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map(
      (r) => r.name,
    ),
  );
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`Applied ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

// CLI entry: `tsx src/db/migrate.ts [--reset]`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.includes('--reset')) await resetDatabase();
    await migrate();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}
