-- 003: customers (homeowners). Fields match the contacts UI in PR #15.
-- Allowed values use CHECK constraints instead of enums so they're easy to change later.

CREATE TABLE customers (
  id                BIGSERIAL PRIMARY KEY,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  email             TEXT,
  phone             TEXT,
  address           TEXT,
  service           TEXT NOT NULL DEFAULT 'hvac'
                    CHECK (service IN ('hvac', 'lawn', 'garage_door')),
  status            TEXT NOT NULL DEFAULT 'lead'
                    CHECK (status IN ('lead', 'active', 'past_customer')),
  preferred_contact TEXT NOT NULL DEFAULT 'text'
                    CHECK (preferred_contact IN ('text', 'call', 'email')),
  follow_up_date    DATE,
  notes             TEXT,
  created_by        BIGINT REFERENCES users (id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Staff need some way to reach the customer.
  CONSTRAINT customers_contact_method CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX customers_created_at_idx ON customers (created_at DESC);
