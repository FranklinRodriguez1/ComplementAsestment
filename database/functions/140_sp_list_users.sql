-- Stored procedure #1 (user query), keyset pagination by (created_at, id).
-- Implemented as a real PROCEDURE (CALL, not SELECT) with an INOUT
-- refcursor parameter -- the standard Postgres pattern for a procedure to
-- "return" a result set.
--
-- Usage (must run inside a single transaction/connection, the cursor does
-- not survive outside it):
--   BEGIN;
--   CALL rw_sp_list_users(NULL, NULL, 20, 'cur_users');
--   FETCH ALL FROM cur_users;
--   COMMIT;
CREATE OR REPLACE PROCEDURE rw_sp_list_users(
  IN    p_cursor_created_at timestamptz,
  IN    p_cursor_id         uuid,
  IN    p_limit             integer,
  INOUT p_cursor_name       refcursor
)
LANGUAGE plpgsql
AS $$
BEGIN
  OPEN p_cursor_name FOR
    SELECT id, email, full_name, job_title, created_at
    FROM rw_users
    WHERE deleted_at IS NULL
      AND (
        p_cursor_created_at IS NULL
        OR (created_at, id) < (p_cursor_created_at, p_cursor_id)
      )
    ORDER BY created_at DESC, id DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
END;
$$;
