-- 005: accounts, their contacts and files, and the services they subscribe to.
-- Based on db/erd_v2.png. Names are snake_case to match the earlier migrations.
-- The ERD's "User" table is already covered by `users` (001), so it isn't created here.
-- `customers` (003) is left alone; accounts are a separate table for now.

CREATE TABLE accounts (
  id          BIGSERIAL PRIMARY KEY,
  is_business BOOLEAN NOT NULL DEFAULT false,
  name        TEXT NOT NULL,
  address_1   TEXT,
  address_2   TEXT,
  city        TEXT,
  state       TEXT,
  zipcode     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX accounts_name_idx ON accounts (lower(name));

-- People at an account. Deleting an account deletes its contacts.
CREATE TABLE contacts (
  id            BIGSERIAL PRIMARY KEY,
  account_id    BIGINT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  first_name    TEXT NOT NULL,
  last_name     TEXT NOT NULL,
  phone         TEXT,
  email_address TEXT,
  address_1     TEXT,
  address_2     TEXT,
  city          TEXT,
  state         TEXT,
  zipcode       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX contacts_account_id_idx ON contacts (account_id);

-- File metadata only; the file itself lives at `url`.
CREATE TABLE files (
  id          BIGSERIAL PRIMARY KEY,
  account_id  BIGINT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  description TEXT,
  url         TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX files_account_id_idx ON files (account_id);

-- The catalog of services an account can subscribe to.
CREATE TABLE services (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Many-to-many: which services each account has. A service that is still
-- in use can't be deleted (RESTRICT); deleting an account removes its links.
CREATE TABLE account_services (
  id         BIGSERIAL PRIMARY KEY,
  account_id BIGINT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  service_id BIGINT NOT NULL REFERENCES services (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT account_services_unique UNIQUE (account_id, service_id)
);

CREATE INDEX account_services_service_id_idx ON account_services (service_id);

-- Row Level Security with no policies, like every other public table (see 004_enable_rls.sql).
-- Blocks Supabase's public REST API; the backend connects as the owner and isn't affected.
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_services ENABLE ROW LEVEL SECURITY;
