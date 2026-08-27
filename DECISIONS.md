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

## Phase 3 -- Frontend (views, ahead of the backend)

Built before the backend REST/WebSocket API, on the user's request. To make that possible without
faking the UI:

- **Mock data layer (`lib/mock/`) stands in for the backend.** `lib/mock/api.ts` exposes async
  functions shaped exactly like the eventual real calls (same params, same return types, artificial
  latency, a simulated failure rate on send) and `lib/mock/fixtures.ts` reuses the same ids/content
  as `database/seed.json`. Every TanStack Query hook in `lib/query/` calls only this module -- when
  the backend exists, swapping its internals for real `fetch`/socket calls should not require
  touching a single component.
- **The mock's channel-membership gate is a preview of RLS, not a replacement for it.**
  `fetchMessages` returns an empty page for a channel the mock session user isn't a member of,
  mirroring the shape of what real RLS enforcement returns -- but this check runs in the browser and
  proves nothing about security. The actual guarantee is the database's RLS policies (see
  `database/README.md`); this is only here so the UI has something real to render before that API
  exists.
- **No shadcn/ui.** `components/ui/` is a half-dozen hand-rolled primitives (button, avatar,
  loading/empty/error states, theme toggle, locale switcher) instead. shadcn would have been faster
  to scaffold, but it generates a lot of code (CVA, Radix wrappers, a `components.json`) that's
  harder to justify line-by-line than a handful of small components written for exactly this UI.
- **`lucide-react` for icons.** The one exception to "no extra UI library": a single, tree-shakeable,
  widely-known SVG icon set beats hand-drawing half a dozen icons, and each one used is easy to point
  to and explain.
- **Responsive "master-detail" layout without parallel/intercepting routes.** Conversation, copilot
  panel, and profile satisfy "minimum 3 zones" as: `/channels/[id]` renders conversation + copilot
  side by side (their own `mobilePane` tab switch below the `lg` breakpoint, since a phone can't show
  both), and `/profile` is a separate route. The sidebar hides itself on mobile via a plain
  `hidden lg:flex` keyed off "is a channel or profile currently open" -- no Next.js parallel-routes
  complexity needed for what is, underneath, just two CSS breakpoints.
- **Optimistic send via TanStack Query, not a hand-rolled queue.** `useSendMessage`
  (`lib/query/messages.ts`) inserts a `pending` message into the infinite-query cache in `onMutate`,
  swaps it for the server's response in `onSuccess`, and flips it to `failed` (keeping it, with a
  retry action) in `onError`. Verified against the mock's real ~20% simulated failure rate in a
  headless browser, not just eyeballed as a static UI state.
- **Keyset-pagination-preserving scroll position is hand-implemented**, not delegated to a library:
  `MessageList` measures `scrollHeight` right before fetching an older page and shifts `scrollTop` by
  the exact delta once the DOM updates, so prepending older messages never visually jumps the
  viewport. Confirmed by scripting a scroll-to-top in a headless browser and watching the loaded
  message count grow without the anchor message moving.
- **The copilot panel's mock keyword-match "RAG"** refuses honestly (a translated "not enough
  information" message) when nothing in the channel matches the question, instead of ever
  fabricating an answer -- the same contract `rw_fn_copilot_context` will enforce for real once the
  backend exists, just previewed here so the empty/refusal state in the UI is real, not decorative.
- **`middleware.ts` renamed to `proxy.ts`** immediately after first noticing the deprecation warning
  from `next dev`: Next.js 16 renamed the convention (`filename + exported function`) to `proxy` to
  reflect what it actually does; keeping the old name would have shipped a deprecated pattern from
  day one in a brand-new project.
- **`next-intl`'s server-side `redirect()` requires an explicit `{ href, locale }`**, unlike the
  plain-string form that works in the client hook -- found by running `tsc --noEmit`, not by
  guessing; fixed by reading the current locale with `getLocale()` in the root page before
  redirecting to `/channels`.

## Phase 4 -- Backend

- **`tsc` path aliases don't survive compilation.** The original plan was `tsc` to `dist/` +
  `node dist/index.js` in production, mirroring the frontend. `tsc`'s `paths` option is
  type-checking-only -- it does not rewrite `@domain/*`-style imports to relative paths in emitted
  JS, so `node dist/index.js` would have crashed immediately on the first `@domain` import. Fixed by
  dropping the compile step entirely: `bun run start` now runs `src/index.ts` directly (Bun resolves
  tsconfig `paths` at runtime, same as `tsx` does in dev), and `tsconfig.json`'s
  `moduleResolution` moved from `NodeNext` (which additionally demands explicit `.js` extensions on
  every relative import, not just aliases) to `bundler` -- matching the frontend's tsconfig, and
  correct for a codebase that's never run through a strict Node ESM loader in the first place.
  `backend/Dockerfile` lost its build stage as a result: no `dist/` artifact to build or copy.
- **No DI container.** Every repository, service, use case, and controller is `new`-ed up by hand in
  `src/index.ts`, the single composition root -- about 25 lines of straightforward wiring. A
  container (Awilix, tsyringe) would add a dependency and a learning curve to solve a problem this
  size doesn't have.
- **Stateless refresh token rotation, no server-side revocation.** Every `/auth/refresh` call issues
  a brand new access+refresh pair, but the old refresh token isn't tracked or blacklisted -- it just
  stays cryptographically valid until it expires on its own. A production system would add a
  `refresh_tokens` table (hash, `jti`, revoked/reuse-detected flags) to actually invalidate a
  rotated-out token and detect theft; that's a real security gap, cut here for time and flagged
  explicitly rather than silently shipped as if it were complete.
- **RLS violations surface as generic errors, mapped by Postgres error code, not by parsing
  messages.** `rw_fn_add_channel_member`'s explicit `RAISE EXCEPTION ... USING ERRCODE='42501'` and a
  bare RLS `WITH CHECK` failure on `rw_messages` both happen to raise SQLSTATE 42501
  (insufficient_privilege) -- both get mapped to a 403 in their respective use cases
  (`AddChannelMemberUseCase`, `SendMessageUseCase`) by checking `error.code`, never by
  string-matching `error.message` (which Postgres doesn't guarantee the wording of across versions).
- **`RealtimePublisher` is a domain-level port** (`domain/services/realtime-publisher.ts`), not an
  infrastructure-only concern living solely next to the Socket.io code: `MessagesController` depends
  on the interface, `infrastructure/sockets/realtime-publisher.ts` provides the only implementation.
  Same pattern as `PasswordHasher`/`TokenService` -- kept consistent rather than making an exception
  for the one port that happens to be about real-time transport.
- **A WebSocket join is gated by the exact same RLS-protected lookup the REST API uses**
  (`ChannelRepository.findById`, called from `socket-server.ts`'s `channel:join` handler) instead of
  a separate permission check: a socket can only join `channel:<id>`'s room -- and therefore only
  receive that channel's `message:new` broadcasts -- if that same actor could also successfully
  `GET /channels/:id`. One source of truth for "can this user see this channel", not two
  implementations that could drift apart.
- **`backend/scripts/migrate.sh` stays a thin shell wrapper around the exact `docker run … psql …`
  command already validated in `database/README.md`, not a JS reimplementation.**
  `database/migrations/0001_init.sql` relies on psql meta-commands (`\ir`, `\if`, `\gset`) that
  `node-pg` (or any plain Postgres client library) cannot execute -- only the real `psql` binary
  understands them.
- **`backend/scripts/seed.ts`, in contrast, IS a real TypeScript script** (not a wrapper): loading
  `database/seed.json` is plain `INSERT`s with no psql-specific syntax involved, so there was no
  reason not to write it directly against `pg`. It connects as `DB_ADMIN_USER` (the migration
  superuser), not `rw_app`: seeding data for five different "users" in one script run isn't
  something `app.current_user_id`-scoped RLS is meant to support, and table owners are exempt from
  RLS anyway (see `database/README.md`). It short-circuits if `rw_users` already has rows rather
  than trying to be idempotent against partial reseeds -- it's meant to run once, against a freshly
  migrated database.
- **`seed.json` gained an explicit `"key"` field per user** (e.g. `"user_ana"`) while writing the
  loader: the original file referenced users this way already, but the mapping from `"user_ana"` to
  the right row only worked by an unwritten "first name of `full_name`, lowercased" convention. Making
  it an explicit field trades a few extra lines for not silently breaking if two seeded users ever
  shared a first name.
- **QA (2 tests against a real Postgres) is not done yet** -- out of this phase's scope as
  discussed, tracked as the next thing to build, not forgotten.

## Phase 5 -- Documentation (Swagger + ER diagram)

- **`docs/swagger/openapi.yaml` documents the API as implemented, not as originally planned.**
  Written by re-reading each controller/route/use-case rather than from memory of the design --
  request/response field names (e.g. `MessagePage.nextCursor`, `ChannelConversation.unreadCount`)
  match the actual JSON responses exactly. Declared `openapi: 3.1.0` at first, then switched to
  `3.0.3` after `redocly lint` rejected `nullable: true` (removed in 3.1's JSON-Schema-aligned
  syntax, which wants `type: [string, "null"]` instead) -- 3.0.3 also has broader tool support
  (Swagger UI, most codegen) than 3.1 does, so this wasn't a reluctant downgrade.
- **`docs/swagger/index.html`** is a ~15-line static page pointing Swagger UI (loaded from a CDN) at
  `./openapi.yaml`. Not built into the app or served by the backend -- it is meant to be opened via
  any static file server (or the `file://` protocol) purely as documentation tooling, so it adds no
  runtime dependency to `backend/` or `frontend/`.
- **`docs/der.pdf` is generated, not hand-drawn**: a Mermaid `erDiagram` (entities/columns/PK-FK-UK
  markers/cardinality transcribed directly from `database/ddl/*.sql`) rendered in a headless Chromium
  page and exported with Playwright's `page.pdf()`. The alternative -- a GUI ER tool (dbdiagram.io,
  pgAdmin's ERD) -- would need the schema re-entered by hand and re-exported by hand every time a
  table changes; this way the diagram is one script re-run away from staying accurate, though it
  isn't wired into any CI/pre-commit step to enforce that (out of scope for the time available).
  `rw_v_user_conversations` is deliberately left off the diagram: it's a derived view, not a stored
  table, so including it would misrepresent it as another first-class entity.
- **The PDF page size is measured, not fixed** (`page.evaluate` reads `document.body.scrollHeight`
  after the diagram renders, then that exact size is passed to `page.pdf({ width, height })`):
  the first attempt used a fixed `format: "A3", landscape: true` and silently split the one diagram
  across 4 PDF pages (one of them blank) because the content was taller than a single A3 page --
  caught by reading the rendered PDF back before calling it done, not assumed to be correct because
  the render command exited without error.
- Both were generated with `playwright`, installed and removed again as a dev-only, one-off
  rendering tool -- neither `frontend/` nor `backend/` gained a runtime dependency on it.
