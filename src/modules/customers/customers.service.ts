import { pool } from '../../db/pool.js';
import type {
  ConvertCustomerInput,
  CreateCustomerInput,
  CustomerStatus,
  UpdateCustomerInput,
} from './customers.schema.js';

export interface Customer {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  service: CreateCustomerInput['service'];
  status: CustomerStatus;
  preferredContact: CreateCustomerInput['preferredContact'];
  followUpDate: string | null;
  notes: string | null;
  /** The account this customer became. Set when converted. */
  accountId: number | null;
  convertedAt: string | null;
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
  account_id: string | null;
  converted_at: Date | null;
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
  account_id, converted_at, created_by, created_at, updated_at FROM customers`;

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
    accountId: row.account_id === null ? null : Number(row.account_id),
    convertedAt: row.converted_at ? row.converted_at.toISOString() : null,
    createdBy: row.created_by === null ? null : Number(row.created_by),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** Thrown when an update would leave a customer with neither email nor phone. */
export class MissingContactMethodError extends Error {}

/** Thrown when a request doesn't fit where the customer is in the pipeline (HTTP 409). */
export class PipelineConflictError extends Error {}

/** Thrown when converting into an account id that doesn't exist. */
export class AccountNotFoundError extends Error {}

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
    // A converted customer's status is final; other fields can still be edited.
    const guard = input.status !== undefined ? ` AND status <> 'converted'` : '';
    try {
      const { rowCount } = await pool.query(
        `UPDATE customers SET ${sets.join(', ')}, updated_at = now() WHERE id = $1${guard}`,
        [id, ...fields.map((f) => input[f] ?? null)],
      );
      if (rowCount === 0) {
        if (guard && (await getCustomer(id))) {
          throw new PipelineConflictError('This customer is already converted.');
        }
        return null;
      }
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

export interface Conversion {
  customer: Customer;
  accountId: number;
  contactId: number;
}

/**
 * Converts an opportunity: creates an account (or uses `accountId`) and a contact from the
 * customer's details, then marks the customer converted. All or nothing, in one transaction.
 * Returns null if the customer doesn't exist.
 */
export async function convertCustomer(
  id: number,
  input: ConvertCustomerInput,
): Promise<Conversion | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // FOR UPDATE: two clicks at once can't both convert the same customer.
    const { rows } = await client.query<CustomerRow>(
      'SELECT * FROM customers WHERE id = $1 FOR UPDATE',
      [id],
    );
    const row = rows[0];
    if (!row) {
      await client.query('ROLLBACK');
      return null;
    }
    if (row.status === 'converted') {
      throw new PipelineConflictError('This customer is already converted.');
    }
    if (row.status !== 'opportunity') {
      throw new PipelineConflictError(
        'Only opportunities can be converted. Mark it as an opportunity first.',
      );
    }

    let accountId: number;
    if (input.accountId !== undefined) {
      const found = await client.query('SELECT 1 FROM accounts WHERE id = $1', [input.accountId]);
      if (found.rowCount === 0) throw new AccountNotFoundError();
      accountId = input.accountId;
    } else {
      // Customers are homeowners, so the account is a person, named after them.
      const account = await client.query<{ id: string }>(
        `INSERT INTO accounts (is_business, name, address_1) VALUES (false, $1, $2) RETURNING id`,
        [`${row.first_name} ${row.last_name}`, row.address],
      );
      accountId = Number(account.rows[0]!.id);
    }

    const contact = await client.query<{ id: string }>(
      `INSERT INTO contacts (account_id, first_name, last_name, phone, email_address, address_1)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [accountId, row.first_name, row.last_name, row.phone, row.email, row.address],
    );

    await client.query(
      `UPDATE customers SET status = 'converted', account_id = $2, converted_at = now(),
         updated_at = now() WHERE id = $1`,
      [id, accountId],
    );
    await client.query('COMMIT');
    return {
      customer: (await getCustomer(id))!,
      accountId,
      contactId: Number(contact.rows[0]!.id),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
