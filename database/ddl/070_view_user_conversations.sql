-- View of the authenticated user's conversations. Takes no parameters: it
-- self-filters by app.current_user_id (the same actor the RLS policies
-- key off), so "SELECT * FROM rw_v_user_conversations" already returns
-- exclusively the channels of the current session's user. Being a plain
-- view (not SECURITY DEFINER), it runs with the calling role's privileges,
-- so the base tables' RLS policies still apply on top of this explicit
-- filter (defense in depth).
CREATE VIEW rw_v_user_conversations AS
SELECT
  cm.channel_id,
  c.name                    AS channel_name,
  c.description,
  lm.id                     AS last_message_id,
  lm.content                AS last_message_preview,
  lm.created_at             AS last_message_at,
  lm.user_id                AS last_message_user_id,
  COALESCE(unread.unread_count, 0) AS unread_count
FROM rw_channel_members cm
JOIN rw_channels c
  ON c.id = cm.channel_id
 AND c.deleted_at IS NULL
LEFT JOIN LATERAL (
  SELECT m.id, m.content, m.created_at, m.user_id
  FROM rw_messages m
  WHERE m.channel_id = cm.channel_id
    AND m.deleted_at IS NULL
  ORDER BY m.seq DESC
  LIMIT 1
) lm ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS unread_count
  FROM rw_messages m
  LEFT JOIN rw_message_reads mr
    ON mr.user_id = cm.user_id
   AND mr.channel_id = cm.channel_id
  WHERE m.channel_id = cm.channel_id
    AND m.deleted_at IS NULL
    AND m.seq > COALESCE(mr.last_read_seq, 0)
) unread ON true
WHERE cm.user_id = current_setting('app.current_user_id', true)::uuid;
