import { migrate, resetDatabase } from '../src/db/migrate.js';
import { closePool } from '../src/db/pool.js';

// Runs once before the suite: give the test database a clean, fully-migrated schema.
export default async function setup(): Promise<void> {
  await resetDatabase();
  await migrate();
  await closePool();
}
