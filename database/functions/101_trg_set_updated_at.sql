-- Generic utility: keeps updated_at correct on every UPDATE. This is not
-- the trigger required by the assignment (that's
-- 100_trg_messages_search_vector), but without it the updated_at columns
-- declared in the DDL would stay frozen at their creation value.
CREATE OR REPLACE FUNCTION rw_fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER rw_trg_users_set_updated_at
  BEFORE UPDATE ON rw_users
  FOR EACH ROW
  EXECUTE FUNCTION rw_fn_set_updated_at();

CREATE TRIGGER rw_trg_channels_set_updated_at
  BEFORE UPDATE ON rw_channels
  FOR EACH ROW
  EXECUTE FUNCTION rw_fn_set_updated_at();

CREATE TRIGGER rw_trg_messages_set_updated_at
  BEFORE UPDATE ON rw_messages
  FOR EACH ROW
  EXECUTE FUNCTION rw_fn_set_updated_at();
