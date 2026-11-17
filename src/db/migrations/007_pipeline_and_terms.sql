-- 007: sales pipeline on customers, and contract terms on accounts.
-- A customer now moves lead -> opportunity -> converted. Converting creates (or links) an
-- account, so `account_id` and `converted_at` are set together by POST /api/customers/:id/convert.
--
-- This file was rebuilt from the schema Eryckson already applied to Supabase on 2026-11-17,
-- under the same name, so Supabase (which has it recorded in schema_migrations) skips it.

-- Pipeline statuses. Existing rows: active -> opportunity, past_customer -> lead.
ALTER TABLE customers DROP CONSTRAINT customers_status_check;
UPDATE customers SET status = 'opportunity' WHERE status = 'active';
UPDATE customers SET status = 'lead' WHERE status = 'past_customer';
ALTER TABLE customers ADD CONSTRAINT customers_status_check
  CHECK (status IN ('lead', 'opportunity', 'converted'));

-- More service lines.
ALTER TABLE customers DROP CONSTRAINT customers_service_check;
ALTER TABLE customers ADD CONSTRAINT customers_service_check
  CHECK (service IN ('hvac', 'garage_door', 'painting_interior', 'painting_exterior',
                     'plumbing', 'flooring', 'tree', 'lawn'));

-- The account a converted customer became. Deleting the account keeps the customer row.
ALTER TABLE customers
  ADD COLUMN account_id   BIGINT REFERENCES accounts (id) ON DELETE SET NULL,
  ADD COLUMN converted_at TIMESTAMPTZ;

CREATE INDEX customers_account_id_idx ON customers (account_id);

-- Contract terms on accounts.
ALTER TABLE accounts
  ADD COLUMN status     TEXT NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new', 'renewed', 'expired')),
  ADD COLUMN start_date DATE,
  ADD COLUMN end_date   DATE,
  ADD CONSTRAINT accounts_term_order
    CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date);
