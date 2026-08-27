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
