-- Critical transactional function: the only path to enroll a third party
-- into a channel. The permission check ("only an existing member can
-- invite another user") happens inside the function -- not only as an RLS
-- policy -- because besides restricting reads, this also restricts a
-- write with a business rule (who is allowed to invite) that RLS alone
-- does not express clearly.
CREATE OR REPLACE FUNCTION rw_fn_add_channel_member(
  p_actor_id     uuid,
  p_channel_id   uuid,
  p_new_user_id  uuid
)
RETURNS rw_channel_members
LANGUAGE plpgsql
AS $$
DECLARE
  v_member rw_channel_members;
BEGIN
  IF NOT rw_fn_is_channel_member(p_channel_id, p_actor_id) THEN
    RAISE EXCEPTION 'actor % is not a member of channel %, cannot add members',
      p_actor_id, p_channel_id
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  IF NOT EXISTS (SELECT 1 FROM rw_users WHERE id = p_new_user_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'user % does not exist or is deactivated', p_new_user_id
      USING ERRCODE = '28000';
  END IF;

  BEGIN
    INSERT INTO rw_channel_members (channel_id, user_id, added_by)
    VALUES (p_channel_id, p_new_user_id, p_actor_id)
    RETURNING * INTO v_member;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'user % is already a member of channel %', p_new_user_id, p_channel_id
        USING ERRCODE = '23505';
  END;

  RETURN v_member;
END;
$$;
