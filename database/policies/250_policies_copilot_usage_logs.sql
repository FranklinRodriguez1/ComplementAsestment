ALTER TABLE rw_copilot_usage_logs ENABLE ROW LEVEL SECURITY;

-- Each user only sees their own usage (used by the "cumulative copilot
-- consumption per user" query).
CREATE POLICY rw_copilot_usage_logs_select_own ON rw_copilot_usage_logs
  FOR SELECT
  USING (user_id = current_setting('app.current_user_id', true)::uuid);

CREATE POLICY rw_copilot_usage_logs_insert_own ON rw_copilot_usage_logs
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.current_user_id', true)::uuid);

-- No UPDATE/DELETE policy: it is an append-only audit log, denied by
-- default.
