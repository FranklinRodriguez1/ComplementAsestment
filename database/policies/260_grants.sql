-- Minimal privileges for the application role. Note the deliberate absence
-- of DELETE on rw_channels, rw_messages and rw_copilot_usage_logs: not
-- even at the GRANT level does a physical delete become possible, a second
-- barrier on top of the missing DELETE policies.
GRANT SELECT, INSERT, UPDATE ON rw_users            TO rw_app;
GRANT SELECT, INSERT, UPDATE ON rw_channels          TO rw_app;
GRANT SELECT, INSERT, DELETE ON rw_channel_members   TO rw_app;
GRANT SELECT, INSERT, UPDATE ON rw_messages          TO rw_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON rw_message_reads TO rw_app;
GRANT SELECT, INSERT ON rw_copilot_usage_logs        TO rw_app;
GRANT SELECT ON rw_v_user_conversations              TO rw_app;

-- Needed for rw_app to use the GENERATED ALWAYS AS IDENTITY column on
-- rw_messages.seq.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rw_app;

-- Functions/procedures: revoke the default EXECUTE grant Postgres gives to
-- PUBLIC on creation, and grant it explicitly only to rw_app (principle of
-- least privilege).
REVOKE EXECUTE ON FUNCTION rw_fn_messages_search_vector()  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION rw_fn_set_updated_at()          FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION rw_fn_is_channel_member(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION rw_fn_create_channel(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION rw_fn_add_channel_member(uuid, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION rw_fn_copilot_context(uuid, vector, uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON PROCEDURE rw_sp_list_users(timestamptz, uuid, integer, refcursor) FROM PUBLIC;
REVOKE EXECUTE ON PROCEDURE rw_sp_edit_or_delete_user(uuid, uuid, text, text, boolean) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION rw_fn_is_channel_member(uuid, uuid)                 TO rw_app;
GRANT EXECUTE ON FUNCTION rw_fn_create_channel(uuid, text, text)              TO rw_app;
GRANT EXECUTE ON FUNCTION rw_fn_add_channel_member(uuid, uuid, uuid)          TO rw_app;
GRANT EXECUTE ON FUNCTION rw_fn_copilot_context(uuid, vector, uuid, integer)  TO rw_app;
GRANT EXECUTE ON PROCEDURE rw_sp_list_users(timestamptz, uuid, integer, refcursor) TO rw_app;
GRANT EXECUTE ON PROCEDURE rw_sp_edit_or_delete_user(uuid, uuid, text, text, boolean) TO rw_app;
-- The trigger functions (rw_fn_messages_search_vector, rw_fn_set_updated_at)
-- are invoked internally by Postgres when firing a trigger on an
-- INSERT/UPDATE that rw_app is already authorized to perform; they don't
-- need an explicit GRANT EXECUTE for rw_app, but PUBLIC access is revoked
-- anyway for consistency.
