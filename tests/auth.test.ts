import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { closePool, pool } from '../src/db/pool.js';

const app = createApp();
const valid = { email: 'jane@example.com', password: 'supersecret1', name: 'Jane Doe' };

function cookies(header: string | string[] | undefined): string[] {
  if (!header) return [];
  return Array.isArray(header) ? header : [header];
}

function sessionId(header: string | string[] | undefined): string | undefined {
  return cookies(header)
    .find((c) => c.startsWith('connect.sid='))
    ?.split(';')[0];
}

beforeEach(async () => {
  await pool.query('TRUNCATE users, "session" RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await closePool();
});

describe('POST /api/auth/signup', () => {
  it('creates a user, returns 201 without the password hash, and logs them in', async () => {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/signup').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email: valid.email,
      name: valid.name,
      role: 'associate',
    });
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.body.user.passwordHash).toBeUndefined();

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(valid.email);
  });

  it('stores a hashed password, not plaintext', async () => {
    await request(app).post('/api/auth/signup').send(valid);
    const { rows } = await pool.query('SELECT password_hash FROM users');
    expect(rows[0].password_hash).not.toContain(valid.password);
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
  });

  it('rejects a duplicate email (case-insensitive) with 409', async () => {
    await request(app).post('/api/auth/signup').send(valid);
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...valid, email: 'JANE@example.com' });
    expect(res.status).toBe(409);
  });

  it('ignores a client-supplied role', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...valid, role: 'manager' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('associate');
  });

  it.each([
    ['invalid email', { ...valid, email: 'nope' }],
    ['short password', { ...valid, password: 'short' }],
    ['missing name', { email: valid.email, password: valid.password }],
  ])('returns 400 for %s', async (_label, body) => {
    const res = await request(app).post('/api/auth/signup').send(body);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/signup').send(valid);
  });

  it('logs in with correct credentials and sets a session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: valid.email, password: valid.password });
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(valid.email);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('is case-insensitive on email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'JANE@EXAMPLE.COM', password: valid.password });
    expect(res.status).toBe(200);
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: valid.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown email with the same 401 message', async () => {
    const wrongPw = await request(app)
      .post('/api/auth/login')
      .send({ email: valid.email, password: 'wrong-password' });
    const unknown = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@example.com', password: 'whatever123' });
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrongPw.body);
  });

  it('returns 400 on a malformed body', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('starts a new session ID on login (no session fixation)', async () => {
    const agent = request.agent(app);
    const first = await agent
      .post('/api/auth/login')
      .send({ email: valid.email, password: valid.password });
    const second = await agent
      .post('/api/auth/login')
      .send({ email: valid.email, password: valid.password });
    expect(sessionId(first.headers['set-cookie'])).toBeDefined();
    expect(sessionId(second.headers['set-cookie'])).not.toBe(
      sessionId(first.headers['set-cookie']),
    );
  });
});

describe('session management', () => {
  it('GET /me returns 401 without a session', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('logout destroys the session', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/signup').send(valid);
    expect((await agent.get('/api/auth/me')).status).toBe(200);

    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(204);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('logout without a session still returns 204', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(204);
  });

  it('sets the session cookie as HttpOnly and SameSite=Lax', async () => {
    const res = await request(app).post('/api/auth/signup').send(valid);
    const cookie = cookies(res.headers['set-cookie']).find((c) => c.startsWith('connect.sid='));
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
  });

  it('persists the session in Postgres', async () => {
    await request.agent(app).post('/api/auth/signup').send(valid);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM "session"');
    expect(rows[0].n).toBe(1);
  });
});

describe('malformed requests', () => {
  it('returns 400 JSON (not 500) for invalid JSON', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 413 JSON (not 500) for a body over the size limit', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: valid.email, password: 'x'.repeat(200_000) }));
    expect(res.status).toBe(413);
    expect(res.body.error).toBeDefined();
  });
});

describe('misc', () => {
  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('unknown routes return 404 JSON', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
  });
});
