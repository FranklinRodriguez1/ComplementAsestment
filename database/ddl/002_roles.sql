-- Application role: used by the backend for ALL business queries.
-- No BYPASSRLS: this is the real guarantee that the policies defined in
-- policies/ always apply, without exception -- including the AI copilot's
-- queries. The password is injected as a psql variable (:app_password)
-- from the migration script, never hardcoded in this file.
--
-- CREATE ROLE runs as a top-level statement (not inside a DO $$...$$ block)
-- because psql does NOT substitute :'var' variables inside dollar-quoted
-- text -- if it were inside the DO block, :'app_password' would be sent to
-- the server verbatim, unsubstituted, and fail with a syntax error.
SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rw_app') AS role_exists \gset

\if :role_exists
  \echo 'rw_app already exists, skipping CREATE ROLE'
\else
  CREATE ROLE rw_app LOGIN PASSWORD :'app_password'
    NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS NOREPLICATION;
\endif

-- Nobody but rw_app (and the migration superuser) operates on the
-- application schema.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO rw_app;
