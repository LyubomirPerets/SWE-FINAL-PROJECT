import bcrypt from 'bcryptjs';
import { pool } from '../../db/pool.js';
import type { SignupInput } from './user.schema.js';

export type Role = 'associate' | 'manager';

export interface PublicUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  password_hash: string;
  created_at: Date;
}

const BCRYPT_ROUNDS = 10;
// Used to keep login timing similar whether or not the email exists.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_ROUNDS);

function toPublic(row: UserRow): PublicUser {
  return {
    id: Number(row.id),
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at.toISOString(),
  };
}

export class EmailTakenError extends Error {
  constructor() {
    super('Email already registered');
  }
}

export async function createUser(input: SignupInput): Promise<PublicUser> {
  const hash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  try {
    // Signup always creates an associate; managers are promoted by other means.
    const { rows } = await pool.query<UserRow>(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'associate') RETURNING *`,
      [input.email, hash, input.name],
    );
    return toPublic(rows[0]!);
  } catch (err) {
    if ((err as { code?: string }).code === '23505') throw new EmailTakenError();
    throw err;
  }
}

export async function verifyCredentials(
  email: string,
  password: string,
): Promise<PublicUser | null> {
  const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE lower(email) = lower($1)', [
    email,
  ]);
  const row = rows[0];
  const ok = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
  return row && ok ? toPublic(row) : null;
}

export async function findById(id: number): Promise<PublicUser | null> {
  const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ? toPublic(rows[0]) : null;
}
