# Database

PostgreSQL 15+ (tested on `pgvector/pgvector:pg16`), `bd_franklin_rodriguez_thompson`.

## Entities

| Table                        | What it represents                                                        |
|-------------------------------|-----------------------------------------------------------------------------|
| `rw_users`                    | Accounts. Never physically deleted (`deleted_at`).                        |
| `rw_channels`                  | Channels. A single type: access is always by membership, no exceptions.    |
| `rw_channel_members`           | Source of truth for "who can see what". Every RLS policy on channels/messages relies on this table. |
| `rw_messages`                  | Messages. Never physically deleted (`deleted_at`). `seq` is the pagination column (see below). |
| `rw_message_reads`             | Read pointer per (user, channel) -- not one row per message read.          |
| `rw_copilot_usage_logs`        | Append-only audit/consumption log for the AI copilot.                      |
| `rw_v_user_conversations` (view) | The authenticated user's channels, with last message and unread count.  |

Entity-relationship diagram: `docs/der.pdf` (pending, generated when the database phase is closed).

## Modeling decisions (made before writing the DDL)

- **No channel types (public/private):** access is always by membership, no exceptions -- not even a channel's name is visible to a non-member.
- **No direct messages (DMs):** out of scope for the MVP (see `DECISIONS.md`).
- **No roles within a channel:** all members are equal. The only real permission distinction is "member" vs. "not a member".
- **Membership by invitation, not self-service:** only an existing member can add another user (`rw_fn_add_channel_member`). There is no public channel directory to "browse and join" -- that would require exposing channel names to non-members, exactly what the non-negotiable requirement forbids.

## Normalization

**1NF (atomicity):** holds across every table, with one documented exception: `rw_copilot_usage_logs.source_message_ids` is a `uuid[]`. This is a deliberate choice, not an oversight: that citation list is an indivisible part of ONE copilot answer -- it is always read together with the rest of the row, never filtered or joined on an individual array element. Modeling it as a separate `rw_copilot_usage_log_sources(log_id, message_id)` table would be "textbook" 1NF, at the cost of an extra JOIN for a relationship that in practice is always consumed as a single unit.

**2NF (full dependency on the key):** only relevant for the tables with a composite key:
- `rw_channel_members` (PK `channel_id, user_id`): `added_by` and `joined_at` describe the event "this user joined this channel" -- they depend on both columns of the key together, not on either one alone.
- `rw_message_reads` (PK `user_id, channel_id`): `last_read_message_id`, `last_read_seq`, `last_read_at` describe "how far this user has read in this channel" -- same case.

**3NF (no transitive dependencies):** the most relevant case was found and fixed during design, not avoided from the start: the first version of `rw_messages` had a `status text CHECK (status IN ('sent','edited','deleted'))` column in addition to `edited_at`/`deleted_at`, with a CHECK forcing `status = 'deleted' <=> deleted_at IS NOT NULL`. That is exactly a functional dependency of one non-key attribute (`status`) on another non-key attribute (`deleted_at`), instead of depending directly on the primary key. `status` was removed: the state is now derived at read time (`deleted_at IS NOT NULL` -> deleted; else `edited_at IS NOT NULL` -> edited; else sent), with no redundant column that could drift out of sync.

## RLS: what actually broke when tested, and why the final design differs

The whole migration was tested against a real Postgres instance (not just a paper exercise), and two real RLS bugs showed up, both fixed and documented inline in the SQL:

1. **Infinite policy recursion.** The `SELECT` policy on `rw_channel_members` originally compared the row against `rw_channel_members` itself (`EXISTS (SELECT 1 FROM rw_channel_members cm2 WHERE ...)`). Postgres rejects that with `infinite recursion detected in policy`: it cannot resolve a policy that, to decide which rows are visible, needs to evaluate that same policy on that same table. Fixed with a `SECURITY DEFINER` helper, `rw_fn_is_channel_member(channel_id, user_id)` (`functions/105_fn_is_channel_member.sql`), which performs the check outside of RLS (it runs with the table owner's privileges, and the owner is never subject to RLS unless `FORCE ROW LEVEL SECURITY` is used, which this schema deliberately does not use). Every policy that needs "is the actor a member of this channel?" uses that same helper.
2. **`INSERT ... RETURNING` subject to the `SELECT` policy.** In `rw_fn_create_channel`, `INSERT INTO rw_channels ... RETURNING *` used to fail with `new row violates row-level security policy`: Postgres requires a row returned by `RETURNING` to also pass the table's `SELECT` policy, and at the moment of the insert the creator is not yet a member (that row is created in the next statement). Fixed by generating the channel's `id` ahead of time in PL/pgSQL (instead of depending on `RETURNING`) and reading the full row back only at the end, after the membership row exists.

Both bugs and their fixes are commented directly in the SQL (`functions/105_*.sql`, `functions/110_*.sql`) because they are exactly the kind of detail that needs to be explainable during the defense.

## Keyset pagination

`rw_messages.seq` is a `bigint GENERATED ALWAYS AS IDENTITY` used purely for pagination: a `uuid` is not chronologically orderable, so an `id`-based cursor would not work. `WHERE channel_id = :c AND seq < :cursor ORDER BY seq DESC LIMIT :n` uses the `rw_messages_channel_seq_idx (channel_id, seq DESC)` index and does not degrade with page depth, unlike `OFFSET`.

## How to apply the schema

```bash
cp .env.example .env   # edit values

docker compose up -d db

# Wait for the healthcheck to report "healthy", then:
docker run --rm --network frank_default \
  -e PGPASSWORD="$DB_ADMIN_PASSWORD" \
  -v "$(pwd)/database:/database" \
  pgvector/pgvector:pg16 \
  psql -h db -U "$DB_ADMIN_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 -v app_password="$DB_PASSWORD" \
  -f /database/migrations/0001_init.sql
```

> In the backend phase this gets wrapped by `bun run db:migrate` (and `bun run db:seed` to load `seed.json`), documented in the root `README.md`. The command above is the real one, already validated against Postgres, with no dependency on that wrapper existing.

## The 4 required queries

Live in `queries/`, each commented with its design rationale:

1. `01_channel_history_keyset.sql` -- a channel's history, keyset pagination.
2. `02_search_messages_highlight.sql` -- full-text search with `ts_headline`.
3. `03_copilot_context.sql` -- copilot context, permissions validated in SQL (`rw_fn_copilot_context`).
4. `04_copilot_usage_by_user.sql` -- cumulative copilot consumption per user.

## `seed.json`

`seed.json` at the root of `database/` ships 5 users, 3 channels and 10 messages, built specifically to demonstrate cross-channel isolation without having to write data by hand (see `_business_rules_implicit` inside the file). All users share the demo password `Demo1234!`; the `password_hash` values are real bcrypt hashes of that value, never plaintext.
