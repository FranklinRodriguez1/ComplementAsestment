-- Read state: a single pointer per (user, channel) to the last message
-- read, not one row per message read (avoids an N users x M messages
-- explosion).
CREATE TABLE rw_message_reads (
  user_id             uuid        NOT NULL REFERENCES rw_users(id)    ON DELETE CASCADE,
  channel_id          uuid        NOT NULL REFERENCES rw_channels(id) ON DELETE CASCADE,
  last_read_message_id uuid       REFERENCES rw_messages(id) ON DELETE SET NULL,
  last_read_seq       bigint      NOT NULL DEFAULT 0,
  last_read_at        timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, channel_id),
  CONSTRAINT rw_message_reads_seq_nonneg_chk CHECK (last_read_seq >= 0)
);

-- user_id / channel_id -> CASCADE: a read pointer makes no sense without
-- the user or the channel it belongs to.
-- last_read_message_id -> SET NULL (nullable): last_read_seq is kept as a
-- fallback if the specific message row disappeared; it must not drag down
-- the user's entire read state for the channel.
