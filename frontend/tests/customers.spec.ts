import { expect, test } from '@playwright/test';
import type { BrowserContext } from '@playwright/test';
import type { User } from '../src/types/auth';
import type { Customer } from '../src/types/customer';

function makeCustomer(over: Partial<Customer>): Customer {
  return {
    id: 1,
    firstName: 'Dana',
    lastName: 'Whitfield',
    email: 'dana@example.com',
    phone: '555-0101',
    address: '14 Maple Ave',
    service: 'hvac',
    status: 'active',
    preferredContact: 'text',
    followUpDate: '2027-04-01',
    notes: null,
    createdBy: 1,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...over,
  };
}

// A tiny in-memory stand-in for the backend: auth/me plus customer CRUD.
async function fakeBackend(context: BrowserContext, role: User['role'] = 'associate') {
  const server = {
    customers: [
      makeCustomer({}),
      makeCustomer({
        id: 2,
        firstName: 'Luis',
        lastName: 'Ortega',
        email: null,
        phone: '555-0102',
        service: 'garage_door',
        status: 'past_customer',
        address: '820 Oak Ridge Dr',
        followUpDate: null,
      }),
    ],
    requests: [] as { method: string; path: string; body: unknown }[],
  };
  const user: User = { id: 1, name: 'Jane', email: 'j@example.com', role, createdAt: '' };
  await context.addCookies([
    { name: 'connect.sid', value: 's', url: 'http://127.0.0.1:4173', httpOnly: true },
  ]);
  await context.route('**/api/auth/me', (route) => route.fulfill({ json: { user } }));
  // Match on the path: a glob like **/api/customers** would also catch Vite's /src/api/customers.ts.
  await context.route(
    (url) => url.pathname.startsWith('/api/customers'),
    async (route) => {
      const req = route.request();
      const path = new URL(req.url()).pathname;
      const id = Number(path.split('/')[3]);
      const body = req.postDataJSON() as Record<string, string> | null;
      server.requests.push({ method: req.method(), path, body });
      if (req.method() === 'GET') return route.fulfill({ json: { customers: server.customers } });
      if (req.method() === 'POST') {
        if (!body?.email && !body?.phone)
          return route.fulfill({
            status: 400,
            json: { error: 'Validation failed', details: { phone: ['Need email or phone'] } },
          });
        const created = makeCustomer({
          ...body,
          id: 3,
          email: body.email || null,
          followUpDate: body.followUpDate || null,
        } as Partial<Customer>);
        server.customers = [created, ...server.customers];
        return route.fulfill({ status: 201, json: { customer: created } });
      }
      if (req.method() === 'PATCH') {
        const i = server.customers.findIndex((c) => c.id === id);
        server.customers[i] = { ...server.customers[i], ...(body as Partial<Customer>) };
        return route.fulfill({ json: { customer: server.customers[i] } });
      }
      server.customers = server.customers.filter((c) => c.id !== id);
      return route.fulfill({ status: 204 });
    },
  );
  return server;
}

test('lists customers from the API and filters them', async ({ page, context }) => {
  await fakeBackend(context);
  await page.goto('/customers');
  await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();
  await expect(page.getByText('2 total')).toBeVisible();
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText('HVAC');
  await expect(rows.first()).toContainText('Active');

  await page.getByLabel('Filter by service').selectOption('garage_door');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Luis Ortega');

  await page.getByLabel('Filter by service').selectOption('');
  await page.getByLabel('Search customers').fill('dana@');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Dana Whitfield');
});

test('adds a customer, requiring an email or phone first', async ({ page, context }) => {
  const server = await fakeBackend(context);
  await page.goto('/customers');
  await page.getByRole('button', { name: 'Add customer' }).click();
  await page.getByLabel('First name').fill('Pat');
  await page.getByLabel('Last name').fill('Homeowner');
  await page.getByRole('button', { name: 'Add customer' }).last().click();
  await expect(page.getByText('Add an email or phone number')).toBeVisible();
  expect(server.requests.filter((r) => r.method === 'POST')).toHaveLength(0);

  await page.getByLabel('Phone').fill('555-0199');
  await page.getByLabel('Service', { exact: true }).selectOption('lawn');
  await page.getByRole('button', { name: 'Add customer' }).last().click();
  await expect(page.getByRole('status')).toHaveText('Pat Homeowner added.');
  await expect(page.locator('tbody tr')).toHaveCount(3);
  const post = server.requests.find((r) => r.method === 'POST');
  expect(post?.body).toMatchObject({
    firstName: 'Pat',
    lastName: 'Homeowner',
    phone: '555-0199',
    email: '',
    service: 'lawn',
    status: 'lead',
  });
});

test('edits and deletes a customer', async ({ page, context }) => {
  const server = await fakeBackend(context);
  await page.goto('/customers');
  await page.getByRole('button', { name: 'Edit Dana Whitfield' }).click();
  await expect(page.getByLabel('Email')).toHaveValue('dana@example.com');
  await page.getByLabel('Status', { exact: true }).selectOption('past_customer');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByRole('status')).toHaveText('Dana Whitfield updated.');
  expect(server.requests.find((r) => r.method === 'PATCH')?.path).toBe('/api/customers/1');

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Edit Dana Whitfield' }).click();
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('status')).toHaveText('Dana Whitfield deleted.');
  await expect(page.locator('tbody tr')).toHaveCount(1);
});

test('technicians get a read-only list', async ({ page, context }) => {
  await fakeBackend(context, 'technician');
  await page.goto('/customers');
  await expect(page.locator('tbody tr')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Add customer' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Edit/ })).toHaveCount(0);
});

test('signed-out visitors are sent to login', async ({ page, context }) => {
  await context.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 401, json: { error: 'Authentication required' } }),
  );
  await page.goto('/customers');
  await expect(page).toHaveURL(/\/login\?next=%2Fcustomers/);
});
