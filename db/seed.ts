// Seeds accounts, services, contacts, files and account_services from the
// SQL files in this folder. Run with `npm run db:seed` (after src/db/seed.ts).
// Every file is safe to run twice, and all of them run in one transaction.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, closePool } from '../src/db/pool.js';

const dir = path.dirname(fileURLToPath(import.meta.url));

// Order matters: contacts, files and links look up accounts and services by name,
// and interaction log entries look up contacts by email.
const files = [
  'seedAccount.sql',
  'seedService.sql',
  'seedContact.sql',
  'seedFile.sql',
  'seedAccountService.sql',
  'seedInteractionLog.sql',
];

export async function seedFromSqlFiles(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const file of files) {
      const sql = await readFile(path.join(dir, file), 'utf8');
      const result = await client.query(sql);
      console.log(`${file}: ${result.rowCount ?? 0} rows inserted`);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await seedFromSqlFiles();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}
