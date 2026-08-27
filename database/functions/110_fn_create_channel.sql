-- Transactional function: creating a channel and enrolling its creator as
-- the first member is a single atomic operation (if the second INSERT
-- failed, the freshly created channel must not be persisted either).
-- Validates the actor inside the function, does not trust the application
-- layer to have already done so.
--
-- The channel id is generated HERE (instead of "RETURNING * INTO" on the
-- INSERT) on purpose: an "INSERT ... RETURNING" also requires the row to
-- pass the table's SELECT policy (rw_channels_select_member, which
-- requires membership). At the moment of the INSERT the creator is not yet
-- a member -- that row is created in the next statement -- so RETURNING
-- used to fail with "new row violates row-level security policy"
-- (reproduced testing against a real Postgres instance, see
-- DECISIONS.md). Generating the id up front avoids depending on
-- RETURNING; the final SELECT that returns the full row happens AFTER the
-- membership is created, at which point the SELECT policy is satisfied.
CREATE OR REPLACE FUNCTION rw_fn_create_channel(
  p_actor_id    uuid,
  p_name        text,
  p_description text DEFAULT NULL
)
RETURNS rw_channels
LANGUAGE plpgsql
AS $$
DECLARE
  v_channel_id uuid := gen_random_uuid();
  v_channel    rw_channels;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'actor_id is required' USING ERRCODE = '22004';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM rw_users WHERE id = p_actor_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'actor % does not exist or is deactivated', p_actor_id
      USING ERRCODE = '28000';
  END IF;

  BEGIN
    INSERT INTO rw_channels (id, name, description, created_by)
    VALUES (v_channel_id, btrim(p_name), p_description, p_actor_id);
  EXCEPTION
    WHEN unique_violation THEN
      -- On error, neither insert is persisted: propagating the exception
      -- makes Postgres roll back every effect of this function call.
      RAISE EXCEPTION 'a channel named "%" already exists', p_name
        USING ERRCODE = '23505';
  END;

  INSERT INTO rw_channel_members (channel_id, user_id, added_by)
  VALUES (v_channel_id, p_actor_id, p_actor_id);

  SELECT * INTO v_channel FROM rw_channels WHERE id = v_channel_id;
  RETURN v_channel;
END;
$$;
