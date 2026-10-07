-- 001: users + session store
-- NOTE: ERD owner may extend this with customers / interactions in later migrations.

CREATE TYPE user_role AS ENUM ('associate', 'manager');

CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'associate',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness for emails
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));

-- Session table for connect-pg-simple
CREATE TABLE "session" (
  "sid"    VARCHAR NOT NULL PRIMARY KEY,
  "sess"   JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL
);
CREATE INDEX "IDX_session_expire" ON "session" ("expire");
