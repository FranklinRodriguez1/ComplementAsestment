-- Permission helper used by EVERY RLS policy that needs to check channel
-- membership.
--
-- Why it exists: an RLS policy on rw_channel_members defined with a
-- correlated EXISTS against rw_channel_members itself triggers "infinite
-- recursion detected in policy for relation rw_channel_members" --
-- Postgres cannot resolve a policy that, to decide which rows are
-- visible, needs to evaluate that same policy on that same table.
-- (Reproduced and confirmed while testing the migration against a real
-- Postgres instance, see DECISIONS.md.)
--
-- The standard fix is to isolate the check in a SECURITY DEFINER function:
-- running with the privileges of whoever created it (the migration role,
-- the table owner), that single internal query is exempt from RLS --
-- tables never apply RLS to their owner unless FORCE ROW LEVEL SECURITY is
-- used, which this schema deliberately does not use (see ddl/*.sql). SET
-- search_path pins the schema to avoid "search path hijacking", the
-- classic risk with SECURITY DEFINER functions.
CREATE OR REPLACE FUNCTION rw_fn_is_channel_member(p_channel_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM rw_channel_members
    WHERE channel_id = p_channel_id AND user_id = p_user_id
  );
$$;
