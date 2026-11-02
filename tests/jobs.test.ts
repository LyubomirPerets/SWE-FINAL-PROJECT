// The jobs table doesn't exist yet, so these cover validation and role checks only.
// Once it lands, replace the 501 expectations with real CRUD assertions.
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { closePool, pool } from '../src/db/pool.js';
import { loginAs } from './helpers.js';

const app = createApp();

const job = {
  customerId: 1,
  serviceType: 'garage_door',
  scheduledAt: '2026-11-03T09:00:00-06:00',
  assignedTo: 2,
};

beforeEach(async () => {
  await pool.query('TRUNCATE users, "session" RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await closePool();
});

describe('jobs scaffold', () => {
  it('requires login', async () => {
    expect((await request(app).get('/api/jobs')).status).toBe(401);
  });

  it('lets office staff create a job and defaults status to scheduled', async () => {
    const agent = await loginAs(app, 'manager');
    const res = await agent.post('/api/jobs').send(job);
    expect(res.status).toBe(201);
    expect(res.body.job).toMatchObject({ ...job, status: 'scheduled' });
  });

  it('rejects an unknown service type and a date without a timezone', async () => {
    const agent = await loginAs(app, 'associate');
    const res = await agent
      .post('/api/jobs')
      .send({ ...job, serviceType: 'plumbing', scheduledAt: '2026-11-03 09:00' });
    expect(res.status).toBe(400);
    expect(res.body.details.serviceType).toBeDefined();
    expect(res.body.details.scheduledAt).toBeDefined();
  });

  it('blocks technicians from creating or deleting jobs', async () => {
    const agent = await loginAs(app, 'technician');
    expect((await agent.post('/api/jobs').send(job)).status).toBe(403);
    expect((await agent.delete('/api/jobs/1')).status).toBe(403);
  });

  it('lets technicians update only status and notes', async () => {
    const agent = await loginAs(app, 'technician');
    const ok = await agent.patch('/api/jobs/1').send({ status: 'completed', notes: 'New spring' });
    expect(ok.status).toBe(501); // passes validation; no table yet
    const blocked = await agent.patch('/api/jobs/1').send({ assignedTo: 5 });
    expect(blocked.status).toBe(400);
  });

  it('lets office staff reassign a job', async () => {
    const agent = await loginAs(app, 'associate');
    const res = await agent.patch('/api/jobs/1').send({ assignedTo: 5 });
    expect(res.status).toBe(501);
    expect(res.body.data).toEqual({ assignedTo: 5 });
  });
});
