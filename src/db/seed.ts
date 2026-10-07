import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { pool, closePool } from './pool.js';

const SEED_PASSWORD = 'Password123!';

const seedUsers = [
  { email: 'manager@example.com', name: 'Morgan Manager', role: 'manager' },
  { email: 'associate@example.com', name: 'Alex Associate', role: 'associate' },
  { email: 'associate2@example.com', name: 'Sam Associate', role: 'associate' },
] as const;

export async function seed(): Promise<void> {
  const hash = await bcrypt.hash(SEED_PASSWORD, 10);
  for (const u of seedUsers) {
    await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [u.email, hash, u.name, u.role],
    );
  }
  console.log(`Seeded ${seedUsers.length} users (password: ${SEED_PASSWORD})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await seed();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}
