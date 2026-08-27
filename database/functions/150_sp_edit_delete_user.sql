-- Stored procedure #2 (user edit / delete). No admin role in the MVP
-- scope: the only permission rule is that a user can only modify or
-- deactivate their own account -- validated inside the procedure, not
-- merely assumed from the application layer. Deletion is always a soft
-- delete (deleted_at), never a physical DELETE.
--
-- Usage:
--   CALL rw_sp_edit_or_delete_user(:actor_id, :actor_id, 'New Name', NULL, false);
--   CALL rw_sp_edit_or_delete_user(:actor_id, :actor_id, NULL, NULL, true);
CREATE OR REPLACE PROCEDURE rw_sp_edit_or_delete_user(
  IN p_actor_id       uuid,
  IN p_target_user_id uuid,
  IN p_full_name      text,
  IN p_job_title      text,
  IN p_delete         boolean
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_actor_id IS NULL OR p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'actor_id and target_user_id are required' USING ERRCODE = '22004';
  END IF;

  IF p_actor_id <> p_target_user_id THEN
    RAISE EXCEPTION 'user % is not allowed to modify user %', p_actor_id, p_target_user_id
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM rw_users WHERE id = p_target_user_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'user % does not exist or is already deactivated', p_target_user_id
      USING ERRCODE = 'P0002';
  END IF;

  IF p_delete THEN
    UPDATE rw_users
    SET deleted_at = now()
    WHERE id = p_target_user_id;
  ELSE
    IF p_full_name IS NULL AND p_job_title IS NULL THEN
      RAISE EXCEPTION 'nothing to update: provide full_name and/or job_title'
        USING ERRCODE = '22023';
    END IF;

    UPDATE rw_users
    SET full_name = COALESCE(NULLIF(btrim(p_full_name), ''), full_name),
        job_title = COALESCE(NULLIF(btrim(p_job_title), ''), job_title)
    WHERE id = p_target_user_id;
  END IF;
END;
$$;
