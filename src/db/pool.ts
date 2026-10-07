import pg from 'pg';
import { config } from '../config.js';

export const pool = new pg.Pool({ connectionString: config.DATABASE_URL });

pool.on('error', (err) => {
  console.error('Unexpected Postgres pool error', err);
});

export async function closePool(): Promise<void> {
  await pool.end();
}
