-- Messages. Never physically deleted: "deleted" is a state read off
-- deleted_at, not a DELETE operation.
--
-- No `status` column: a separate "sent/edited/deleted" value would be
-- redundant with deleted_at/edited_at (it would functionally depend on
-- them, not on the key in its own right) -- exactly the dependency 3NF
-- asks to remove. State is derived: deleted_at IS NOT NULL -> deleted;
-- else edited_at IS NOT NULL -> edited; else sent. The application layer
-- maps that to whatever readable status DTO the UI needs.
--
-- `seq` is the pagination column: a UUID is not chronologically orderable,
-- so a separate auto-incrementing bigint is added purely for keyset
-- pagination ("WHERE seq < :cursor").
CREATE TABLE rw_messages (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  seq            bigint        GENERATED ALWAYS AS IDENTITY,
  channel_id     uuid          NOT NULL REFERENCES rw_channels(id) ON DELETE RESTRICT,
  user_id        uuid          REFERENCES rw_users(id) ON DELETE SET NULL,
  content        text          NOT NULL,
  edited_at      timestamptz   NULL,
  deleted_at     timestamptz   NULL,
  search_vector  tsvector      NULL,
  embedding      vector(1536)  NULL,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT rw_messages_content_len_chk
    CHECK (char_length(content) BETWEEN 1 AND 4000),
  CONSTRAINT rw_messages_edited_at_after_created_chk
    CHECK (edited_at IS NULL OR edited_at >= created_at),
  CONSTRAINT rw_messages_deleted_at_after_created_chk
    CHECK (deleted_at IS NULL OR deleted_at >= created_at)
);

-- channel_id -> RESTRICT: a channel is archived via soft delete, never
-- physically deleted; this FK makes the database reject any attempt at a
-- physical DELETE of a channel that still has messages, instead of
-- cascading and destroying the history.
-- user_id -> SET NULL (nullable column): if a user row were ever
-- physically purged (e.g. a legal erasure request), the message is kept
-- with an "unknown author" instead of losing channel history. In the
-- normal app flow users are only deactivated via soft delete, so this is a
-- safeguard, not the expected path.

-- Keyset pagination: a channel's history ordered by seq descending.
CREATE INDEX rw_messages_channel_seq_idx ON rw_messages (channel_id, seq DESC);

-- Full-text search (kept up to date by trigger, see functions/100_*).
CREATE INDEX rw_messages_search_vector_idx ON rw_messages USING gin (search_vector);

-- Semantic search for the RAG copilot (cosine similarity).
CREATE INDEX rw_messages_embedding_idx ON rw_messages
  USING hnsw (embedding vector_cosine_ops);
