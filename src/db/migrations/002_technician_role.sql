-- 002: technicians are the field crew (PRD persona "Technician / Crew Member").
-- Postgres 12+ allows ADD VALUE inside a transaction as long as the new value
-- isn't used in that same transaction, which this file doesn't do.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'technician';
