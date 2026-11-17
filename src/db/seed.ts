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

  await seedCustomerRows();
  await seedAccountRows();
}

async function seedCustomerRows(): Promise<void> {
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

// [name, description, price]
const seedServices = [
  ['Basic Plan', 'Starter package for small teams', '29.00'],
  ['Premium Plan', 'Full feature set with priority access', '99.00'],
  ['Enterprise Plan', 'Custom limits and dedicated manager', '299.00'],
  ['24/7 Support', 'Round-the-clock phone and chat support', '19.99'],
  ['Onboarding', 'One-time setup and training session', '149.00'],
] as const;

type SeedAccount = {
  isBusiness: boolean;
  name: string;
  address: [string, string | null, string, string, string]; // address_1, address_2, city, state, zipcode
  contacts: [string, string, string, string][]; // first, last, phone, email (address copied from account)
  files: [string, string, string][]; // file_name, description, url
  services: (typeof seedServices)[number][0][];
};

const seedAccounts: SeedAccount[] = [
  {
    isBusiness: true,
    name: 'Acme Corp',
    address: ['100 Main St', 'Suite 200', 'Phoenix', 'AZ', '85001'],
    contacts: [
      ['Ann', 'Smith', '602-555-1001', 'ann.smith@acme.example'],
      ['Bob', 'Jones', '602-555-1002', 'bob.jones@acme.example'],
    ],
    files: [
      [
        'acme_contract.pdf',
        'Signed service contract',
        'https://example.com/files/acme_contract.pdf',
      ],
      ['acme_logo.png', 'Company logo', 'https://example.com/files/acme_logo.png'],
    ],
    services: ['Premium Plan', '24/7 Support', 'Onboarding'],
  },
  {
    isBusiness: true,
    name: 'Globex Inc',
    address: ['200 Oak Ave', null, 'Austin', 'TX', '73301'],
    contacts: [
      ['Cara', 'Lee', '512-555-2001', 'cara.lee@globex.example'],
      ['Dan', 'Park', '512-555-2002', 'dan.park@globex.example'],
    ],
    files: [
      [
        'globex_invoice_001.pdf',
        'First invoice',
        'https://example.com/files/globex_invoice_001.pdf',
      ],
    ],
    services: ['Basic Plan', '24/7 Support'],
  },
  {
    isBusiness: true,
    name: 'Initech LLC',
    address: ['450 Elm Blvd', 'Floor 3', 'Dallas', 'TX', '75201'],
    contacts: [['Erin', 'Brooks', '214-555-3001', 'erin.brooks@initech.example']],
    files: [
      ['initech_w9.pdf', 'Tax form W-9', 'https://example.com/files/initech_w9.pdf'],
      [
        'initech_proposal.docx',
        'Project proposal',
        'https://example.com/files/initech_proposal.docx',
      ],
    ],
    services: ['Enterprise Plan', 'Onboarding'],
  },
  {
    isBusiness: false,
    name: 'Jane Doe',
    address: ['300 Pine Rd', null, 'Denver', 'CO', '80201'],
    contacts: [['Jane', 'Doe', '303-555-4001', 'jane.doe@example.com']],
    files: [['jane_id_scan.jpg', 'ID verification', 'https://example.com/files/jane_id_scan.jpg']],
    services: ['Basic Plan'],
  },
  {
    isBusiness: false,
    name: 'John Smith',
    address: ['12 Cedar Ln', 'Apt 4B', 'Seattle', 'WA', '98101'],
    contacts: [['John', 'Smith', '206-555-5001', 'john.smith@example.com']],
    files: [
      ['john_agreement.pdf', 'Customer agreement', 'https://example.com/files/john_agreement.pdf'],
    ],
    services: ['Premium Plan'],
  },
];

async function seedAccountRows(): Promise<void> {
  // services.name is unique, so the catalog can be upserted every run.
  for (const [name, description, price] of seedServices) {
    await pool.query(
      `INSERT INTO services (name, description, price) VALUES ($1, $2, $3)
       ON CONFLICT (name) DO NOTHING`,
      [name, description, price],
    );
  }

  // Accounts have no natural unique key, so only seed an empty table (safe to run twice).
  const { rows } = await pool.query<{ n: string }>('SELECT count(*) AS n FROM accounts');
  if (Number(rows[0]!.n) > 0) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const a of seedAccounts) {
      const {
        rows: [account],
      } = await client.query<{ id: string }>(
        `INSERT INTO accounts (is_business, name, address_1, address_2, city, state, zipcode)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [a.isBusiness, a.name, ...a.address],
      );
      for (const [first, last, phone, email] of a.contacts) {
        await client.query(
          `INSERT INTO contacts (account_id, first_name, last_name, phone, email_address,
             address_1, address_2, city, state, zipcode)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [account!.id, first, last, phone, email, ...a.address],
        );
      }
      for (const [fileName, description, url] of a.files) {
        await client.query(
          `INSERT INTO files (account_id, file_name, description, url) VALUES ($1, $2, $3, $4)`,
          [account!.id, fileName, description, url],
        );
      }
      for (const serviceName of a.services) {
        await client.query(
          `INSERT INTO account_services (account_id, service_id)
           SELECT $1, id FROM services WHERE name = $2`,
          [account!.id, serviceName],
        );
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  console.log(`Seeded ${seedServices.length} services and ${seedAccounts.length} accounts`);
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
