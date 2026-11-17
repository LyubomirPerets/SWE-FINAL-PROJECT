-- 006: interaction log. One row per touchpoint with a contact (call, email, visit...).
-- Every entry belongs to a contact; the account is reached through contacts.account_id.

CREATE TABLE interaction_log (
  id         BIGSERIAL PRIMARY KEY,
  contact_id BIGINT NOT NULL REFERENCES contacts (id) ON DELETE CASCADE,
  type       TEXT NOT NULL
             CHECK (type IN ('call', 'email', 'text', 'meeting', 'visit', 'note')),
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX interaction_log_contact_id_idx ON interaction_log (contact_id, created_at DESC);

ALTER TABLE interaction_log ENABLE ROW LEVEL SECURITY;