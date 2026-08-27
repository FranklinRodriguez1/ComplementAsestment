-- Required query 2/4: message search with highlighted term (ts_headline),
-- optionally scoped to a single channel.
--
-- search_vector is kept up to date by the rw_trg_messages_search_vector
-- trigger (see functions/100_*.sql) -- it is always in sync with the
-- current content, it never needs to be recomputed in the query. ts_rank
-- orders by relevance; the rw_messages_search_vector_idx GIN index speeds
-- up the "@@" filter. RLS automatically restricts this search to the
-- actor's channels too: a message from someone else's channel can never be
-- found by text search.

SELECT
  id,
  channel_id,
  user_id,
  ts_headline(
    'english',
    content,
    plainto_tsquery('english', $2),
    'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MaxWords=25,MinWords=5'
  ) AS highlighted_content,
  ts_rank(search_vector, plainto_tsquery('english', $2)) AS rank,
  created_at
FROM rw_messages
WHERE ($1::uuid IS NULL OR channel_id = $1)   -- $1 = NULL -> search across all of the actor's channels
  AND deleted_at IS NULL
  AND search_vector @@ plainto_tsquery('english', $2)
ORDER BY rank DESC, seq DESC
LIMIT $3;
