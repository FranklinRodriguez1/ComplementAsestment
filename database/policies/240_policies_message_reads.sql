ALTER TABLE rw_message_reads ENABLE ROW LEVEL SECURITY;

-- A user can only read/write their own read pointer, and only for
-- channels where they are actually a member.
CREATE POLICY rw_message_reads_own_row ON rw_message_reads
  FOR ALL
  USING (user_id = current_setting('app.current_user_id', true)::uuid)
  WITH CHECK (
    user_id = current_setting('app.current_user_id', true)::uuid
    AND rw_fn_is_channel_member(channel_id, current_setting('app.current_user_id', true)::uuid)
  );
