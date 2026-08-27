-- Channels. A single type (no public/private): access is always decided by
-- membership, with no exceptions. Soft delete: an archived channel keeps
-- its message history.
CREATE TABLE rw_channels (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  description text        NULL,
  created_by  uuid        NOT NULL REFERENCES rw_users(id) ON DELETE RESTRICT,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz NULL,

  CONSTRAINT rw_channels_name_len_chk
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 80)
);

-- created_by -> RESTRICT: a channel must always be traceable to whoever
-- created it. In this model users are never physically deleted (see
-- 010_users.sql), so this FK is a defensive safeguard, not a case that is
-- expected to fire in normal operation.

-- Required PARTIAL unique index: two active channels cannot share a name
-- (case-insensitive), but a name is freed once the channel is archived
-- (deleted_at IS NOT NULL) and can be reused.
CREATE UNIQUE INDEX rw_channels_name_active_uq
  ON rw_channels (lower(name))
  WHERE deleted_at IS NULL;
