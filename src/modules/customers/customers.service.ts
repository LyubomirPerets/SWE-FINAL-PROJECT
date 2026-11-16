import { pool } from '../../db/pool.js';
import type { CreateCustomerInput, UpdateCustomerInput } from './customers.schema.js';

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  service: CreateCustomerInput['service'];
  status: CreateCustomerInput['status'];
  preferredContact: CreateCustomerInput['preferredContact'];
  followUpDate: string | null;
  notes: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

interface CustomerRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  service: Customer['service'];
  status: Customer['status'];
  preferred_contact: Customer['preferredContact'];
  follow_up_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

// API field name -> column name, for fields the client may write.
const columns = {
  firstName: 'first_name',
  lastName: 'last_name',
  email: 'email',
  phone: 'phone',
  address: 'address',
  service: 'service',
  status: 'status',
  preferredContact: 'preferred_contact',
  followUpDate: 'follow_up_date',
  notes: 'notes',
} as const satisfies Record<keyof UpdateCustomerInput, string>;

// Return DATE as 'YYYY-MM-DD' text so time zones can't shift it by a day.
const SELECT = `SELECT id, first_name, last_name, email, phone, address, service, status,
  preferred_contact, to_char(follow_up_date, 'YYYY-MM-DD') AS follow_up_date, notes,
  created_by, created_at, updated_at FROM customers`;

function toCustomer(row: CustomerRow): Customer {
  return {
    id: Number(row.id),
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    service: row.service,
    status: row.status,
    preferredContact: row.preferred_contact,
    followUpDate: row.follow_up_date,
    notes: row.notes,
    createdBy: row.created_by === null ? null : Number(row.created_by),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** Thrown when an update would leave a customer with neither email nor phone. */
export class MissingContactMethodError extends Error {}

function isContactMethodViolation(err: unknown): boolean {
  const e = err as { code?: string; constraint?: string };
  return e.code === '23514' && e.constraint === 'customers_contact_method';
}

export async function listCustomers(): Promise<Customer[]> {
  const { rows } = await pool.query<CustomerRow>(`${SELECT} ORDER BY created_at DESC, id DESC`);
  return rows.map(toCustomer);
}

export async function getCustomer(id: number): Promise<Customer | null> {
  const { rows } = await pool.query<CustomerRow>(`${SELECT} WHERE id = $1`, [id]);
  return rows[0] ? toCustomer(rows[0]) : null;
}

export async function createCustomer(
  input: CreateCustomerInput,
  createdBy: number,
): Promise<Customer> {
  const fields = Object.keys(columns) as (keyof typeof columns)[];
  const names = [...fields.map((f) => columns[f]), 'created_by'];
  const values = [...fields.map((f) => input[f] ?? null), createdBy];
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO customers (${names.join(', ')})
     VALUES (${names.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING id`,
    values,
  );
  return (await getCustomer(Number(rows[0]!.id)))!;
}

export async function updateCustomer(
  id: number,
  input: UpdateCustomerInput,
): Promise<Customer | null> {
  const fields = (Object.keys(input) as (keyof typeof columns)[]).filter(
    (f) => input[f] !== undefined,
  );
  if (fields.length > 0) {
    const sets = fields.map((f, i) => `${columns[f]} = $${i + 2}`);
    try {
      const { rowCount } = await pool.query(
        `UPDATE customers SET ${sets.join(', ')}, updated_at = now() WHERE id = $1`,
        [id, ...fields.map((f) => input[f] ?? null)],
      );
      if (rowCount === 0) return null;
    } catch (err) {
      if (isContactMethodViolation(err)) throw new MissingContactMethodError();
      throw err;
    }
  }
  return getCustomer(id);
}

export async function deleteCustomer(id: number): Promise<boolean> {
  const { rowCount } = await pool.query('DELETE FROM customers WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}
