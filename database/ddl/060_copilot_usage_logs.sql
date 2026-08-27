-- Copilot usage log: one row per question answered (or rejected). It is an
-- append-only audit/consumption record -- never edited or deleted, so it
-- has no deleted_at.
CREATE TABLE rw_copilot_usage_logs (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES rw_users(id)    ON DELETE RESTRICT,
  channel_id         uuid        REFERENCES rw_channels(id) ON DELETE SET NULL,
  question           text        NOT NULL,
  answer             text        NULL,
  source_message_ids uuid[]      NOT NULL DEFAULT '{}',
  prompt_tokens      integer     NOT NULL DEFAULT 0,
  completion_tokens  integer     NOT NULL DEFAULT 0,
  model              text        NOT NULL,
  latency_ms         integer     NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT rw_copilot_usage_logs_question_not_blank_chk
    CHECK (char_length(btrim(question)) > 0),
  CONSTRAINT rw_copilot_usage_logs_tokens_nonneg_chk
    CHECK (prompt_tokens >= 0 AND completion_tokens >= 0),
  CONSTRAINT rw_copilot_usage_logs_latency_nonneg_chk
    CHECK (latency_ms IS NULL OR latency_ms >= 0)
);

-- user_id -> RESTRICT: usage is an audit/billing record, it must always
-- survive; it cannot silently disappear if the user were ever physically
-- deleted (which, in the normal flow, never happens: see 010_users.sql).
-- channel_id -> SET NULL (nullable): the log is still useful even if the
-- context channel has been archived/removed; it does not depend on it to
-- exist.

CREATE INDEX rw_copilot_usage_logs_user_idx ON rw_copilot_usage_logs (user_id, created_at);
