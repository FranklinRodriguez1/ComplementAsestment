ALTER TABLE rw_channels ENABLE ROW LEVEL SECURITY;
-- FORCE ROW LEVEL SECURITY is not used: the table owner is the migration
-- role (superuser), which is never the role used by the backend (rw_app).
-- rw_app, having no BYPASSRLS, is already subject to these policies
-- without exception.

-- Only a member can see the channel (not even its name is visible to
-- someone who doesn't belong to it). Uses the rw_fn_is_channel_member
-- helper instead of an inline EXISTS against rw_channel_members -- see
-- functions/105_*.sql for why (avoids policy recursion).
CREATE POLICY rw_channels_select_member ON rw_channels
  FOR SELECT
  USING (rw_fn_is_channel_member(id, current_setting('app.current_user_id', true)::uuid));

-- Safety net: the real creation flow goes through rw_fn_create_channel
-- (creates the channel AND the initial membership in a single
-- transaction). This policy only covers the case of a direct INSERT.
CREATE POLICY rw_channels_insert_self ON rw_channels
  FOR INSERT
  WITH CHECK (created_by = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY rw_channels_update_member ON rw_channels
  FOR UPDATE
  USING (rw_fn_is_channel_member(id, current_setting('app.current_user_id', true)::uuid));

-- No DELETE policy: with RLS enabled, the absence of a policy for a given
-- command denies that command by default. A channel is archived via soft
-- delete (UPDATE deleted_at), never physically deleted.
