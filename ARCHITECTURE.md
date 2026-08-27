# Architecture

> Living document. Filled in as each project phase advances.

## Monorepo

Three independent modules (`frontend/`, `backend/`, `database/`) plus `docs/`, orchestrated by a
single `docker-compose.yml` at the root. No workspace manager (Turborepo/Nx) is used because each
module has its own lifecycle and dependency stack, and the scope of this assessment doesn't
justify that extra layer.

## Backend: Clean Architecture

```
domain/          entities and repository interfaces, no external dependencies
application/     use cases (orchestrate domain + infrastructure)
infrastructure/  concrete implementations: Postgres, JWT, Socket.io, AI provider
presentation/    Express: routes, controllers, middlewares
```

Dependency rule: `presentation -> application -> domain`, and `infrastructure` implements
interfaces defined in `domain`. The domain never imports `express` or the Postgres driver --
verified by inspection; no layer-boundary linter is configured (out of scope for the 8-hour
window).

## Database: why RLS instead of only application-layer filters

The non-negotiable requirement is that no user can read content from a channel they don't belong
to, "not even via AI." A `WHERE channel_id IN (...)` filter hand-written into every application-
layer query is fragile: it only takes one new query -- including the copilot's -- forgetting that
filter to leak data. Row Level Security moves that guarantee into the database: the application
role has no `BYPASSRLS`, so no query -- not even the ones the copilot builds -- can ever see rows
from someone else's channel, regardless of what the application layer does or doesn't do.

The actor is fixed per transaction with `SELECT set_config('app.current_user_id', :id, true)` (the
backend does this on every request, from the `userId` extracted out of the verified JWT -- never
from the request body). Policies on `rw_channels`, `rw_channel_members`, `rw_messages`,
`rw_message_reads` and `rw_copilot_usage_logs` all filter against that value. Full detail
(including two real RLS bugs found and fixed while testing against a live Postgres instance --
policy recursion, and `RETURNING` being subject to the SELECT policy) lives in
[`database/README.md`](./database/README.md).

`rw_fn_copilot_context` (used by the AI copilot) does the permission JOIN explicitly in its own
SQL, on top of inheriting RLS by running as `rw_app`: a double barrier, not just a declarative one.

## AI Copilot: swappable provider

`AIProvider` is a project-owned interface in `domain/services` with an embeddings method and a
chat/completions method. The first implementation (`infrastructure/ai`) uses the OpenAI SDK. The
copilot use case depends only on the interface, not on the SDK -- so the provider can be swapped
without touching business logic (Strategy pattern).

> Expanded in the AI phase: context retrieval with permissions validated in SQL, source citation,
> versioned prompt, sanitization against prompt injection.

## Frontend: built ahead of the backend, on a swappable data layer

The frontend was implemented before the backend's REST/WebSocket API existed, at the user's
request. Every screen still needed to be real (not a static mockup), so the data layer is split
so that only one module is a stand-in:

```
lib/mock/          fixtures.ts (seed-data-shaped records) + api.ts (async, latency-simulating
                    functions matching the eventual real endpoints)
lib/query/          TanStack Query hooks -- the ONLY callers of lib/mock/api.ts
lib/stores/         Zustand -- client-only UI state (theme, active mobile pane)
components/         conversation/, copilot/, profile/, layout/, ui/
app/[locale]/       routes (next-intl), thin Server Components that hand off to client components
```

`lib/query/*` hooks are written against `lib/mock/api.ts`'s function signatures, not its
implementation. Replacing that one file with real `fetch`/Socket.io calls in the backend-
integration pass should not require touching a hook's call sites or any component.

**Why TanStack Query owns server state and Zustand owns UI state, not one library for both:**
channels/messages/profile are cached, revalidated, paginated data with a natural request lifecycle
(loading/error/stale) that TanStack Query already models; theme and "which mobile pane is open" are
synchronous, this-tab-only, no-network state that would just add ceremony inside a query cache.

**Message send state (pending -> sent -> failed) is a TanStack Query optimistic mutation**, not a
separate local queue: `onMutate` writes a `pending` message straight into the paginated cache,
`onSuccess`/`onError` resolve it in place. One code path, one source of truth for what's currently
on screen.

**Per-channel isolation is only previewed client-side here**, not enforced: the mock API returns an
empty page for a channel the session user isn't a member of, so the UI has a real empty state to
render, but nothing about this proves security -- that guarantee is entirely the database's RLS
(see above), which the frontend has no way to bypass once it's talking to the real backend.
