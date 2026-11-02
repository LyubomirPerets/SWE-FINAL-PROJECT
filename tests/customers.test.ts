import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { closePool, pool } from '../src/db/pool.js';
import { loginAs } from './helpers.js';

const app = createApp();

const homeowner = {
  firstName: 'Pat',
  lastName: 'Homeowner',
  phone: '555-0100',
  address: '12 Elm St, Springfield',
  service: 'garage_door',
};

beforeEach(async () => {
  await pool.query('TRUNCATE users, customers, "session" RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await closePool();
});

describe('customers API', () => {
  it('requires login', async () => {
    expect((await request(app).get('/api/customers')).status).toBe(401);
  });

  it('creates a customer with defaults and records who created it', async () => {
    const agent = await loginAs(app, 'associate');
    const res = await agent.post('/api/customers').send(homeowner);
    expect(res.status).toBe(201);
    expect(res.body.customer).toMatchObject({
      ...homeowner,
      id: 1,
      email: null,
      status: 'lead',
      preferredContact: 'text',
      followUpDate: null,
      createdBy: 1,
    });
  });

  it('lists, reads, updates, and deletes a customer', async () => {
    const agent = await loginAs(app, 'manager');
    const { body } = await agent.post('/api/customers').send(homeowner);
    const id = body.customer.id;

    const list = await agent.get('/api/customers');
    expect(list.status).toBe(200);
    expect(list.body.customers).toHaveLength(1);

    const one = await agent.get(`/api/customers/${id}`);
    expect(one.body.customer.firstName).toBe('Pat');

    const updated = await agent
      .patch(`/api/customers/${id}`)
      .send({ status: 'active', followUpDate: '2027-04-01', notes: 'Spring replaced' });
    expect(updated.status).toBe(200);
    expect(updated.body.customer).toMatchObject({
      status: 'active',
      followUpDate: '2027-04-01',
      notes: 'Spring replaced',
      phone: '555-0100',
    });

    expect((await agent.delete(`/api/customers/${id}`)).status).toBe(204);
    expect((await agent.get(`/api/customers/${id}`)).status).toBe(404);
  });

  it('treats empty strings from forms as cleared fields', async () => {
    const agent = await loginAs(app, 'associate');
    const res = await agent
      .post('/api/customers')
      .send({ ...homeowner, email: '', address: '', followUpDate: '' });
    expect(res.status).toBe(201);
    expect(res.body.customer).toMatchObject({ email: null, address: null, followUpDate: null });
  });

  it('requires an email or a phone number on create', async () => {
    const agent = await loginAs(app, 'associate');
    const res = await agent.post('/api/customers').send({ firstName: 'Pat', lastName: 'H' });
    expect(res.status).toBe(400);
    expect(res.body.details.phone).toBeDefined();
  });

  it('refuses an update that removes the last contact method', async () => {
    const agent = await loginAs(app, 'associate');
    const { body } = await agent.post('/api/customers').send(homeowner);
    const res = await agent.patch(`/api/customers/${body.customer.id}`).send({ phone: '' });
    expect(res.status).toBe(400);
    expect(res.body.details.phone).toBeDefined();
  });

  it('rejects unknown service, status, and bad dates', async () => {
    const agent = await loginAs(app, 'associate');
    const res = await agent
      .post('/api/customers')
      .send({ ...homeowner, service: 'plumbing', status: 'vip', followUpDate: '11/05/2026' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.details)).toEqual(
      expect.arrayContaining(['service', 'status', 'followUpDate']),
    );
  });

  it('returns 404 for a missing customer and 400 for a bad id', async () => {
    const agent = await loginAs(app, 'associate');
    expect((await agent.get('/api/customers/999')).status).toBe(404);
    expect((await agent.patch('/api/customers/999').send({ notes: 'x' })).status).toBe(404);
    expect((await agent.delete('/api/customers/999')).status).toBe(404);
    expect((await agent.get('/api/customers/abc')).status).toBe(400);
  });

  it('lets technicians read but not create, edit, or delete customers', async () => {
    const office = await loginAs(app, 'associate');
    const { body } = await office.post('/api/customers').send(homeowner);
    const id = body.customer.id;

    const tech = await loginAs(app, 'technician');
    expect((await tech.get('/api/customers')).body.customers).toHaveLength(1);
    expect((await tech.get(`/api/customers/${id}`)).status).toBe(200);
    expect((await tech.post('/api/customers').send(homeowner)).status).toBe(403);
    expect((await tech.patch(`/api/customers/${id}`).send({ notes: 'x' })).status).toBe(403);
    expect((await tech.delete(`/api/customers/${id}`)).status).toBe(403);
  });
});
