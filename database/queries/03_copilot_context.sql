-- Required query 3/4: context retrieval for the copilot, with permissions
-- validated in SQL (not in the application layer).
--
-- Implemented as a function (rw_fn_copilot_context, see
-- functions/130_*.sql) instead of a loose SELECT because the permission
-- filter IS the JOIN against rw_channel_members inside the function --
-- that filter should live in one reusable place, not be rewritten in every
-- backend use case that needs context for the copilot.
--
-- p_actor_id is built by the backend from the already-verified JWT, never
-- from a value received from the client.
SELECT *
FROM rw_fn_copilot_context(
  $1::uuid,          -- actor_id (verified JWT)
  $2::vector(1536),  -- embedding of the user's question
  $3::uuid,          -- optional channel_id, to scope context to one channel
  $4::integer        -- top-k most similar messages
);
