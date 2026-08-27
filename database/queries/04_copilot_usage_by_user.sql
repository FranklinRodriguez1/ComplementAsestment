-- Required query 4/4: cumulative copilot consumption per user.
--
-- The RLS policy on rw_copilot_usage_logs already restricts visible rows
-- to the actor's own; the WHERE user_id = $1 filter is redundant with that
-- policy but is kept explicit for two reasons: query readability, and so
-- the planner can use the rw_copilot_usage_logs_user_idx (user_id,
-- created_at) index instead of relying solely on the plan RLS produces.
SELECT
  user_id,
  count(*)                                    AS total_questions,
  sum(prompt_tokens)                          AS total_prompt_tokens,
  sum(completion_tokens)                      AS total_completion_tokens,
  sum(prompt_tokens + completion_tokens)      AS total_tokens,
  max(created_at)                             AS last_question_at
FROM rw_copilot_usage_logs
WHERE user_id = $1
GROUP BY user_id;
