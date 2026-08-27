-- Channel membership: the ONLY source of truth for "who can see what". The
-- RLS policies on channels and messages (see policies/) rely exclusively
-- on this table.
--
-- No deleted_at: unlike messages, a membership row is not "content" that
-- must be preserved for audit purposes -- leaving a channel simply removes
-- the row.
CREATE TABLE rw_channel_members (
  channel_id uuid        NOT NULL REFERENCES rw_channels(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES rw_users(id)    ON DELETE CASCADE,
  added_by   uuid        NOT NULL REFERENCES rw_users(id)    ON DELETE RESTRICT,
  joined_at  timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (channel_id, user_id)
);

-- channel_id / user_id -> CASCADE: a membership row has no meaning on its
-- own without its channel or its user; if those rows were ever physically
-- removed, the membership should disappear with them.
-- added_by -> RESTRICT: same as created_by on channels, traceability of
-- who invited whom (users are never physically deleted).

CREATE INDEX rw_channel_members_user_idx ON rw_channel_members (user_id);
