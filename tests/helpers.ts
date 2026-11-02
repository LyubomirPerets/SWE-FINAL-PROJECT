import bcrypt from 'bcryptjs';
import type { Express } from 'express';
import request from 'supertest';
import { pool } from '../src/db/pool.js';
import type { Role } from '../src/modules/users/user.service.js';

const PASSWORD = 'supersecret1';

/** Creates a user with the given role and returns a supertest agent logged in as them. */
export async function loginAs(app: Express, role: Role) {
  const email = `${role}-${Math.random().toString(36).slice(2)}@example.com`;
  const hash = await bcrypt.hash(PASSWORD, 4);
  await pool.query('INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)', [
    email,
    hash,
    role,
    role,
  ]);
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/login').send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`Login as ${role} failed: ${res.status}`);
  return agent;
}
