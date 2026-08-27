-- Required query 1/4: a channel's message history, keyset pagination.
--
-- Paginated by "seq" (auto-incrementing bigint), NOT by "created_at" and
-- NOT by OFFSET: created_at can repeat across rows, and OFFSET degrades
-- linearly with position in large tables (Postgres still has to walk and
-- discard every row before it). "seq" is unique and monotonic, so
-- "WHERE seq < :cursor" jumps straight to the cutoff point using the
-- rw_messages_channel_seq_idx (channel_id, seq DESC) index.
--
-- RLS already guarantees channel_id belongs to a channel the actor is a
-- member of (otherwise this query returns 0 rows no matter what is
-- requested) -- no extra permission JOIN/EXISTS is needed here.

-- First page (no cursor yet):
SELECT id, seq, user_id, content, edited_at, deleted_at, created_at
FROM rw_messages
WHERE channel_id = $1
  AND deleted_at IS NULL
ORDER BY seq DESC
LIMIT $2;

-- Subsequent pages: $2 = seq of the last message received in the previous page.
SELECT id, seq, user_id, content, edited_at, deleted_at, created_at
FROM rw_messages
WHERE channel_id = $1
  AND seq < $2
  AND deleted_at IS NULL
ORDER BY seq DESC
LIMIT $3;
