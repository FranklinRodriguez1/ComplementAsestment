ALTER TABLE rw_messages ENABLE ROW LEVEL SECURITY;

-- The heart of the non-negotiable requirement: no row from a channel the
-- actor doesn't belong to is ever visible, for any query -- including the
-- ones the AI copilot builds, which runs under this same role (rw_app) and
-- is therefore subject to this same policy.
CREATE POLICY rw_messages_select_member ON rw_messages
  FOR SELECT
  USING (rw_fn_is_channel_member(channel_id, current_setting('app.current_user_id', true)::uuid));

-- Can only post as yourself, and only in channels you are a member of.
CREATE POLICY rw_messages_insert_member_self ON rw_messages
  FOR INSERT
  WITH CHECK (
    user_id = current_setting('app.current_user_id', true)::uuid
    AND rw_fn_is_channel_member(channel_id, current_setting('app.current_user_id', true)::uuid)
  );

-- Covers editing content (UPDATE content, edited_at=now()) and soft delete
-- (UPDATE deleted_at=now()): both are an UPDATE, and only the author can
-- perform them.
CREATE POLICY rw_messages_update_author ON rw_messages
  FOR UPDATE
  USING (user_id = current_setting('app.current_user_id', true)::uuid)
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

-- No DELETE policy: a message is never physically deleted, it is denied by
-- default since no policy exists for that command.
