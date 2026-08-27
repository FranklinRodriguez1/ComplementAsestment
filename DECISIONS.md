# Decisions and MVP cuts

> Living document. Filled in as each project phase advances (8-hour assessment).

## Phase 1 -- Monorepo structure

- **`frontend/` was not recreated** with `create-next-app`: a working Next.js 16 project (App
  Router, TypeScript, Tailwind v4) already existed and was clean. Recreating it would have been
  redundant work with no upside.
- **Bun** as the package manager in both modules (frontend already had it via `bun.lock`; mirrored
  in backend for monorepo consistency -- a single runtime/lockfile to reason about).
- **`pgvector/pgvector:pg16`** as the Postgres image instead of `postgres:16` plus installing the
  extension by hand: satisfies "Postgres 15+" and ships pgvector ready for the AI phase with no
  extra build steps.
- **Two separate Postgres roles** in `docker-compose.yml`/`.env.example`: `DB_ADMIN_USER`
  (superuser, migrations only) and `DB_USER` (application role, created by the migrations WITHOUT
  `BYPASSRLS`). This is a non-negotiable requirement (real RLS, not just declared), so it was
  decided at the structural level to avoid migrating credentials later.
- **No `docker-entrypoint-initdb.d`** mounted on the `db` service: that mechanism only runs once
  (on an empty volume), which doesn't satisfy the "documented, repeatable migration command"
  requirement. Migrations run as a documented command instead (see `database/README.md`; wrapped
  by a `backend` script once the backend phase starts).
- **Backend placeholder**: a minimal Express app (`/health`) was scaffolded purely so
  `docker compose up` boots something real from day one. The Clean Architecture layers
  (`domain/application/infrastructure/presentation`) were left as empty folders (`.gitkeep`) --
  filled in during the backend phase, not before, to avoid guessing contracts (entities, use
  cases) before the data model existed.

## Phase 2 -- Database

- **No channel types (public/private), no DMs, no in-channel roles**: confirmed with the user
  before modeling. Keeps the schema and RLS policies simple, and the only permission distinction
  that matters for the non-negotiable requirement is "member" vs. "not a member" -- adding roles or
  public browsing would add surface area without adding safety.
- **Membership by invitation only** (`rw_fn_add_channel_member`), no self-service join and no
  public channel directory: the strictest reading of "not even via AI" also implies a channel's
  *name* shouldn't be discoverable by a non-member. A public "browse channels" list would leak
  exactly that.
- **`rw_messages.status` column removed** after an initial draft that included it: it was
  functionally dependent on `deleted_at`/`edited_at` rather than on the primary key (a 3NF
  violation caught while writing the normalization write-up, see `database/README.md`). State is
  now derived from the timestamps instead of stored redundantly.
- **`source_message_ids uuid[]` on `rw_copilot_usage_logs`**: a deliberate, documented 1NF
  exception. A normalized junction table would add a JOIN for a citation list that is always read
  as a single unit alongside its parent row and never queried by individual element.
- **`SECURITY DEFINER` helper (`rw_fn_is_channel_member`)**: not part of the original design --
  added after testing the migration against a real Postgres instance surfaced "infinite recursion
  detected in policy" on `rw_channel_members`'s own SELECT policy (a self-referential EXISTS).
  Documented in detail in `database/README.md` and inline in the SQL, since it's exactly the kind
  of non-obvious fix that needs to be explainable in the defense.
- **Channel id generated in PL/pgSQL instead of via `INSERT ... RETURNING`** in
  `rw_fn_create_channel`: also found by testing against real Postgres -- `RETURNING` is subject to
  the table's SELECT policy, and the creator isn't a member yet at the moment of the INSERT. Same
  file, same reasoning as above.
- **Full-text search language set to `english`** (`to_tsvector('english', ...)`,
  `ts_headline('english', ...)`): matches the project's English-only code/docs convention. Real
  per-message language detection (for a genuinely bilingual ES/EN corpus) is out of scope for the
  MVP -- noted here rather than silently ignored.
- **Everything (code comments, docs, seed data, commit messages) is in English**, matching the
  database identifiers (`rw_` prefix, English table/column names) -- a deliberate consistency
  choice made explicit by the user partway through the database phase, applied retroactively to
  every file written before that point.
