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
  // Ported from the sample data in PR #19, adapted to the home-services customers table.
  [
    'Marcus',
    'Reyes',
    'marcus.reyes@example.com',
    '980-555-0102',
    '45 Trade St, Apt 200, Charlotte, NC 28202',
    'hvac',
    'active',
    'text',
    '2026-11-20',
    'Renewal discussion for annual maintenance plan, est. $8,000. Tech: Lee Nguyen.',
  ],
  [
    'Priya',
    'Patel',
    'priya.patel@example.com',
    '704-555-0103',
    '9 Harbor Rd, Cornelius, NC 28031',
    'lawn',
    'active',
    'call',
    null,
    'Call after 2pm. Weekly mowing, crew: Lee Nguyen.',
  ],
  [
    'Tom',
    'Alvarez',
    'tom.alvarez@example.com',
    '704-555-0104',
    '310 Park Ave, Davidson, NC 28036',
    'hvac',
    'lead',
    'email',
    '2026-11-06',
    'New customer. Quote sent, est. $4,500. Follow up Friday.',
  ],
  [
    'Jenna',
    'Brooks',
    'jenna.brooks@example.com',
    '980-555-0105',
    '77 Lakeshore Dr, Mooresville, NC 28117',
    'garage_door',
    'lead',
    'text',
    null,
    'Referred by Dana Whitfield.',
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

  // Customers have no unique key (some have no email), so skip any seed customer whose
  // first + last name already exists. Safe to run twice, and new seed rows still get added
  // to an already-seeded database such as the shared Supabase one.
  let added = 0;
  for (const c of seedCustomers) {
    const { rowCount } = await pool.query(
      `INSERT INTO customers (first_name, last_name, email, phone, address, service, status,
         preferred_contact, follow_up_date, notes)
       SELECT $1::text, $2::text, $3::text, $4::text, $5::text, $6::text, $7::text, $8::text,
              $9::date, $10::text
       WHERE NOT EXISTS (
         SELECT 1 FROM customers WHERE first_name = $1::text AND last_name = $2::text
       )`,
      [...c],
    );
    added += rowCount ?? 0;
  }
  console.log(`Seeded ${added} new customers (${seedCustomers.length - added} already present)`);
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
