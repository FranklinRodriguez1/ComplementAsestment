-- Context retrieval for the RAG copilot, WITH permissions validated in
-- SQL: the JOIN against rw_channel_members (cm.user_id = p_actor_id) is
-- exactly what guarantees no message from a channel the actor doesn't
-- belong to is ever returned, no matter what the application layer does
-- (or fails to do) above it. This is a second layer of defense on top of
-- RLS: even if the RLS policy on rw_messages were ever misconfigured or
-- disabled, this function would still not leak out-of-scope messages.
--
-- p_actor_id MUST be built by the backend from the verified JWT, never
-- from a value supplied by the client (see infrastructure/auth in the
-- backend phase).
CREATE OR REPLACE FUNCTION rw_fn_copilot_context(
  p_actor_id         uuid,
  p_query_embedding  vector(1536),
  p_channel_id       uuid DEFAULT NULL,
  p_limit            integer DEFAULT 8
)
RETURNS TABLE (
  message_id  uuid,
  channel_id  uuid,
  channel_name text,
  author_id   uuid,
  author_name text,
  content     text,
  created_at  timestamptz,
  similarity  double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    m.id,
    m.channel_id,
    c.name,
    m.user_id,
    u.full_name,
    m.content,
    m.created_at,
    1 - (m.embedding <=> p_query_embedding) AS similarity
  FROM rw_messages m
  JOIN rw_channel_members cm
    ON cm.channel_id = m.channel_id
   AND cm.user_id = p_actor_id                 -- <- permission filter
  JOIN rw_channels c
    ON c.id = m.channel_id
   AND c.deleted_at IS NULL
  LEFT JOIN rw_users u ON u.id = m.user_id
  WHERE m.deleted_at IS NULL
    AND m.embedding IS NOT NULL
    AND (p_channel_id IS NULL OR m.channel_id = p_channel_id)
  ORDER BY m.embedding <=> p_query_embedding
  LIMIT LEAST(GREATEST(p_limit, 1), 20);
$$;
