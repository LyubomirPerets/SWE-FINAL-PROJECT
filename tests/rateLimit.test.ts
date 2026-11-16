import express from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';
import { describe, it, expect } from 'vitest';

function makeApp(limit: number) {
  const app = express();
  app.use(
    rateLimit({
      windowMs: 60_000,
      limit,
      message: { error: 'Too many requests, please try again later' },
    }),
  );
  app.get('/ping', (_req, res) => res.json({ ok: true }));
  return app;
}

describe('rate limiter', () => {
  it('allows requests under the limit', async () => {
    const app = makeApp(3);
    for (let i = 0; i < 3; i++) {
      await request(app).get('/ping').expect(200);
    }
  });

  it('returns 429 with a JSON error once the limit is exceeded', async () => {
    const app = makeApp(3);
    for (let i = 0; i < 3; i++) await request(app).get('/ping');
    const res = await request(app).get('/ping');
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: 'Too many requests, please try again later' });
  });
});
