-- Initial migration: applies the entire schema (ddl/ + functions/ +
-- policies/) in a single fail-fast run (ON_ERROR_STOP aborts on the first
-- error). This is the single source of truth for WHAT gets executed and in
-- which order; the actual content lives organized by type under ddl/,
-- functions/ and policies/ so it stays easy to review.
--
-- Usage (from the repo root, see README.md):
--   psql "$DATABASE_ADMIN_URL" \
--     -v ON_ERROR_STOP=1 \
--     -v app_password="$DB_PASSWORD" \
--     -f database/migrations/0001_init.sql
--
-- \ir resolves relative paths against the location of THIS file (not the
-- directory psql was invoked from), so the command above works no matter
-- where it's run from.

\set ON_ERROR_STOP 1

\if :{?app_password}
\else
  \echo 'ERROR: missing psql variable "app_password". Example: -v app_password="$DB_PASSWORD"'
  \quit 1
\endif

BEGIN;

-- Extensions and application role
\ir ../ddl/001_extensions.sql
\ir ../ddl/002_roles.sql

-- Tables (ordered by FK dependencies)
\ir ../ddl/010_users.sql
\ir ../ddl/020_channels.sql
\ir ../ddl/030_channel_members.sql
\ir ../ddl/040_messages.sql
\ir ../ddl/050_message_reads.sql
\ir ../ddl/060_copilot_usage_logs.sql
\ir ../ddl/070_view_user_conversations.sql

-- Functions, triggers and stored procedures
\ir ../functions/100_trg_messages_search_vector.sql
\ir ../functions/101_trg_set_updated_at.sql
\ir ../functions/105_fn_is_channel_member.sql
\ir ../functions/110_fn_create_channel.sql
\ir ../functions/120_fn_add_channel_member.sql
\ir ../functions/130_fn_copilot_context.sql
\ir ../functions/140_sp_list_users.sql
\ir ../functions/150_sp_edit_delete_user.sql

-- Row Level Security and application role grants
\ir ../policies/210_policies_channels.sql
\ir ../policies/220_policies_channel_members.sql
\ir ../policies/230_policies_messages.sql
\ir ../policies/240_policies_message_reads.sql
\ir ../policies/250_policies_copilot_usage_logs.sql
\ir ../policies/260_grants.sql

COMMIT;

\echo 'Migration 0001_init applied successfully.'
