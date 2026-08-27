ALTER TABLE rw_channel_members ENABLE ROW LEVEL SECURITY;

-- A member can see the full member list of THEIR channels (not of channels
-- they don't belong to). Does NOT use a correlated EXISTS against this
-- same table (rw_channel_members): Postgres rejects that with "infinite
-- recursion detected in policy" -- to decide which rows are visible it
-- would need to evaluate this same policy on this same table. Uses the
-- SECURITY DEFINER helper rw_fn_is_channel_member instead (see
-- functions/105_*.sql), which does that check outside of RLS.
CREATE POLICY rw_channel_members_select_member ON rw_channel_members
  FOR SELECT
  USING (rw_fn_is_channel_member(channel_id, current_setting('app.current_user_id', true)::uuid));

-- Safety net: the real rule ("only an existing member can invite") is
-- validated inside rw_fn_add_channel_member().
CREATE POLICY rw_channel_members_insert_added_by_self ON rw_channel_members
  FOR INSERT
  WITH CHECK (added_by = current_setting('app.current_user_id', true)::uuid);

-- A user can leave a channel on their own. Physical delete is acceptable
-- here: a membership row is not "message content" subject to soft delete.
CREATE POLICY rw_channel_members_delete_self ON rw_channel_members
  FOR DELETE
  USING (user_id = current_setting('app.current_user_id', true)::uuid);
