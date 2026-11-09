import { describe, it } from 'vitest';

// TODO(James): the README promises `npm run db:seed` is safe to run twice. Prove it.
// `seed()` is exported from src/db/seed.ts and uses the test database during tests.
// TRUNCATE users, customers, "session" in beforeEach (see tests/customers.test.ts) and
// call closePool() in afterAll. Change each `it.todo` to `it` and add a body.
describe('db seed', () => {
  // After seed(): 4 users (manager, 2 associates, technician) with the right roles.
  it.todo('creates the four sample users with the right roles');

  // Seed users can log in with the seed password (see SEED_PASSWORD in seed.ts) via POST /api/auth/login.
  it.todo('seed users can log in');

  // Run seed() twice; COUNT(*) of users and customers is the same after the second run.
  it.todo('running seed twice does not duplicate users or customers');

  // Insert a customer named exactly like a seed customer (e.g. first_name 'Dana',
  // last_name 'Whitfield'), then seed(): that one is skipped (still only 1 Dana Whitfield),
  // but the other sample customers are added. The match is on first + last name.
  it.todo('skips sample customers whose name already exists and adds the rest');
});
