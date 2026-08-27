-- Platform users. Never physically deleted (deleted_at): a message must
-- always be able to show who wrote it, even if that account was later
-- deactivated.
CREATE TABLE rw_users (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text        NOT NULL,
  password_hash text        NOT NULL,
  full_name     text        NOT NULL,
  job_title     text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz NULL,

  CONSTRAINT rw_users_email_format_chk
    CHECK (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  CONSTRAINT rw_users_email_lowercase_chk
    CHECK (email = lower(email)),
  CONSTRAINT rw_users_full_name_not_blank_chk
    CHECK (char_length(btrim(full_name)) > 0),
  CONSTRAINT rw_users_job_title_not_blank_chk
    CHECK (char_length(btrim(job_title)) > 0)
);

-- Required plain UNIQUE: no two accounts can share an email, not even if
-- one of them was deactivated (prevents silent reuse).
CREATE UNIQUE INDEX rw_users_email_uq ON rw_users (email);

CREATE INDEX rw_users_active_idx ON rw_users (id) WHERE deleted_at IS NULL;

COMMENT ON COLUMN rw_users.job_title IS 'User job title. The copilot uses it to introduce itself to the authenticated user (name + title) without relying on the frontend.';
