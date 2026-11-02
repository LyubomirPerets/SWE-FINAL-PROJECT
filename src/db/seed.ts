import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { pool, closePool } from './pool.js';

const SEED_PASSWORD = 'Password123!';

const seedUsers = [
  { email: 'manager@example.com', name: 'Morgan Manager', role: 'manager' },
  { email: 'associate@example.com', name: 'Alex Associate', role: 'associate' },
  { email: 'associate2@example.com', name: 'Sam Associate', role: 'associate' },
  { email: 'technician@example.com', name: 'Taylor Technician', role: 'technician' },
] as const;

// [firstName, lastName, email, phone, address, service, status, preferredContact, followUpDate, notes]
const seedCustomers = [
  [
    'Dana',
    'Whitfield',
    'dana.w@example.com',
    '555-0101',
    '14 Maple Ave, Springfield',
    'hvac',
    'active',
    'text',
    '2027-04-01',
    'Carrier furnace, installed 2019. Spring AC tune-up every year.',
  ],
  [
    'Luis',
    'Ortega',
    null,
    '555-0102',
    '820 Oak Ridge Dr, Springfield',
    'garage_door',
    'past_customer',
    'call',
    null,
    'Genie 2-car door. Torsion spring replaced 2025-03.',
  ],
  [
    'Priya',
    'Shah',
    'priya.shah@example.com',
    '555-0103',
    '3 Birch Ct, Shelbyville',
    'lawn',
    'active',
    'text',
    '2026-11-10',
    'Weekly mowing Apr-Oct. Ask about fall cleanup.',
  ],
  [
    'Tom',
    'Becker',
    'tbecker@example.com',
    null,
    null,
    'hvac',
    'lead',
    'email',
    '2026-11-05',
    'Asked for a quote on a new heat pump.',
  ],
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

  // Customers have no natural unique key, so only seed an empty table (safe to run twice).
  const { rows } = await pool.query<{ n: string }>('SELECT count(*) AS n FROM customers');
  if (Number(rows[0]!.n) > 0) return;
  for (const c of seedCustomers) {
    await pool.query(
      `INSERT INTO customers (first_name, last_name, email, phone, address, service, status,
         preferred_contact, follow_up_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [...c],
    );
  }
  console.log(`Seeded ${seedCustomers.length} customers`);
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
