-- Required trigger: keeps rw_messages.search_vector in sync with the
-- content on every INSERT/UPDATE, so full-text search (see
-- queries/02_search_messages_highlight.sql) is never stale.
--
-- The vector embedding (RAG) is NOT kept in sync by a trigger: generating
-- it requires calling the OpenAI API, which cannot happen synchronously
-- inside a Postgres transaction. The backend computes it after inserting
-- the message and persists it with an explicit UPDATE (see
-- infrastructure/ai in the backend/AI phase).
CREATE OR REPLACE FUNCTION rw_fn_messages_search_vector()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', NEW.content);
  RETURN NEW;
END;
$$;

CREATE TRIGGER rw_trg_messages_search_vector
  BEFORE INSERT OR UPDATE OF content ON rw_messages
  FOR EACH ROW
  EXECUTE FUNCTION rw_fn_messages_search_vector();
