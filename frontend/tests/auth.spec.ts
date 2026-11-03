import { expect, test } from '@playwright/test';
import type { BrowserContext, Page } from '@playwright/test';
import type { User } from '../src/types/auth';

const user: User = {
  id: 1,
  name: 'Jane Doe',
  email: 'jane@example.com',
  role: 'associate',
  createdAt: '2026-01-01T00:00:00.000Z',
};
const password = 'Password123!';

async function authServer(context: BrowserContext, signedIn = false) {
  const server = {
    user: signedIn ? { ...user } : (null as User | null),
    meStatus: 200,
    loginStatus: 200,
    signupStatus: 201,
    logoutStatus: 204,
    submissions: [] as { path: string; body: Record<string, string>; contentType: string }[],
  };
  if (signedIn) {
    await context.addCookies([
      {
        name: 'connect.sid',
        value: 'test-session',
        url: 'http://127.0.0.1:4173',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
  }
  await context.route('**/api/auth/*', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const respond = (status: number, body: unknown, setCookie?: string) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: status === 204 ? undefined : JSON.stringify(body),
        headers: setCookie ? { 'set-cookie': setCookie } : {},
      });
    if (path.endsWith('/me')) {
      if (server.meStatus !== 200)
        return respond(server.meStatus, { error: 'Service unavailable' });
      const hasCookie = request.headers().cookie?.includes('connect.sid=test-session');
      return server.user && hasCookie
        ? respond(200, { user: server.user })
        : respond(401, { error: 'Authentication required' });
    }
    expect(request.method()).toBe('POST');
    if (path.endsWith('/logout')) {
      if (server.logoutStatus !== 204)
        return respond(server.logoutStatus, { error: 'Logout failed' });
      server.user = null;
      return respond(204, undefined, 'connect.sid=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
    }
    const body = request.postDataJSON() as Record<string, string>;
    server.submissions.push({ path, body, contentType: request.headers()['content-type'] });
    if (path.endsWith('/login')) {
      if (server.loginStatus !== 200 || body.password !== password)
        return respond(401, { error: 'Invalid email or password' });
      server.user = { ...user, email: body.email };
    } else {
      if (server.signupStatus === 409) return respond(409, { error: 'Email already registered' });
      if (server.signupStatus === 400)
        return respond(400, {
          error: 'Validation failed',
          details: { name: ['Enter a valid name.'] },
        });
      server.user = { ...user, email: body.email, name: body.name };
    }
    return respond(
      path.endsWith('/signup') ? 201 : 200,
      { user: server.user },
      'connect.sid=test-session; Path=/; HttpOnly; SameSite=Lax',
    );
  });
  return server;
}

async function fillLogin(page: Page, value = password) {
  await page.getByLabel('Email address', { exact: true }).fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(value);
}

test('login errors, intended destination, refresh, logout, and back navigation', async ({
  page,
  context,
}) => {
  const server = await authServer(context);
  await page.goto('/dashboard?view=account#details');
  await expect(page).toHaveURL(/\/login\?next=/);
  await fillLogin(page, 'wrong-password');
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page).toHaveURL('/dashboard?view=account#details');
  await expect(page.getByRole('heading', { name: 'Welcome, Jane Doe' })).toBeVisible();
  expect(server.submissions[1].contentType).toBe('application/json');
  expect(
    await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })),
  ).toEqual({ local: 0, session: 0 });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome, Jane Doe' })).toBeVisible();
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goBack();
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Welcome, Jane Doe' })).toHaveCount(0);
});

test('landing signup carries email, validates confirmation, and creates a logged-in account', async ({
  page,
  context,
}) => {
  const server = await authServer(context);
  await page.goto('/');
  await page.getByLabel('Email address', { exact: true }).fill(user.email);
  await page.getByRole('button', { name: 'Try for free' }).click();
  await expect(page).toHaveURL('/signup');
  await expect(page.getByLabel('Email address', { exact: true })).toHaveValue(user.email);
  await page.getByLabel('Full name').fill('  Jane Doe  ');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill('not-matching');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Passwords do not match.')).toBeVisible();
  expect(server.submissions).toHaveLength(0);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByText('Associate', { exact: true })).toBeVisible();
  expect(server.submissions[0].body).toEqual({ name: 'Jane Doe', email: user.email, password });
});

test('signup renders duplicate-email and backend field errors', async ({ page, context }) => {
  const server = await authServer(context);
  server.signupStatus = 409;
  await page.goto('/signup');
  await page.getByLabel('Full name').fill(user.name);
  await fillLogin(page);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('alert')).toHaveText('Email already registered');
  await expect(page.getByLabel('Email address', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  server.signupStatus = 400;
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByText('Enter a valid name.')).toBeVisible();
  await expect(page.getByLabel('Full name')).toHaveAttribute('aria-invalid', 'true');
});

test('startup service failure is retryable without treating the user as signed out', async ({
  page,
  context,
}) => {
  const server = await authServer(context, true);
  server.meStatus = 503;
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'We couldn’t check your session' })).toBeVisible();
  await expect(page).toHaveURL('/dashboard');
  server.meStatus = 200;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome, Jane Doe' })).toBeVisible();
});

test('session checks tolerate network errors and detect expiration while idle', async ({
  page,
  context,
}) => {
  const server = await authServer(context, true);
  await page.clock.install();
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Welcome, Jane Doe' })).toBeVisible();
  server.meStatus = 503;
  const failedCheck = page.waitForResponse(
    (response) => response.url().endsWith('/api/auth/me') && response.status() === 503,
  );
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await failedCheck;
  await expect(page.getByRole('heading', { name: 'Welcome, Jane Doe' })).toBeVisible();
  server.meStatus = 200;
  server.user = null;
  await page.clock.runFor(60_001);
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText('Your session has ended. Please log in again.')).toBeVisible();
});

test('logout failure is visible and logout propagates to another tab after retry', async ({
  page,
  context,
}) => {
  const server = await authServer(context, true);
  await page.goto('/dashboard');
  const other = await context.newPage();
  await other.goto('/dashboard');
  await expect(other.getByRole('heading', { name: 'Welcome, Jane Doe' })).toBeVisible();
  server.logoutStatus = 500;
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('We couldn’t log you out.');
  await expect(page).toHaveURL('/dashboard');
  server.logoutStatus = 204;
  await page.getByRole('button', { name: 'Log out', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(other).toHaveURL(/\/login/);
  await expect(other.getByText(user.email, { exact: true })).toHaveCount(0);
});

test('already signed-in users skip login and external return URLs are rejected', async ({
  page,
  context,
}) => {
  await authServer(context, true);
  await page.goto('/login?next=https://example.com');
  await expect(page).toHaveURL('/dashboard');
  await page.goto('/signup?next=//example.com');
  await expect(page).toHaveURL('/dashboard');
});

test('initial session check does not flash a login form or private content', async ({
  page,
  context,
}) => {
  await authServer(context, true);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/auth/me', async (route) => {
    await gate;
    await route.fulfill({ json: { user } });
  });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Checking your session…' })).toBeVisible();
  await expect(page.getByLabel('Password', { exact: true })).toHaveCount(0);
  await expect(page.getByText(user.email, { exact: true })).toHaveCount(0);
  release();
  await expect(page.getByRole('heading', { name: 'Welcome, Jane Doe' })).toBeVisible();
});

test('pending login disables duplicate submissions', async ({ page, context }) => {
  await authServer(context);
  let release!: () => void;
  let attempts = 0;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/auth/login', async (route) => {
    attempts += 1;
    await gate;
    await route.fulfill({ json: { user } });
  });
  await page.goto('/login');
  await fillLogin(page);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Logging in…' })).toBeDisabled();
  await page.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit());
  expect(attempts).toBe(1);
  release();
  await expect(page).toHaveURL('/dashboard');
});

test('login and signup fit a mobile viewport', async ({ page, context }) => {
  await authServer(context);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/login');
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Create an account' }).click();
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
