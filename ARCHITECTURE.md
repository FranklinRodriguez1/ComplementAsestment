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

**Concretely, per layer:**

- `domain/entities/` -- plain interfaces mirroring the database rows (`User`, `Channel`, `Message`,
  ...), plus `errors/app-error.ts`: a small hierarchy (`ValidationError`, `UnauthorizedError`,
  `ForbiddenError`, `NotFoundError`, `ConflictError`) that use cases throw and
  `presentation/middlewares/error-handler.middleware.ts` -- the only place that knows about HTTP
  status codes -- catches and maps.
- `domain/repositories/` and `domain/services/` -- interfaces only (`UserRepository`,
  `ChannelRepository`, `MessageRepository`, `PasswordHasher`, `TokenService`,
  `RealtimePublisher`). This is the Repository pattern and, for `AIProvider` (coming in the AI
  phase) the Strategy pattern: the application layer is written entirely against these interfaces,
  never against `pg`, `bcryptjs`, `jsonwebtoken`, or `socket.io` directly.
- `application/use-cases/` -- one class per use case (`RegisterUserUseCase`,
  `SendMessageUseCase`, ...), each constructor-injected with the interfaces it needs and exposing a
  single `execute(...)`. True to the assignment's own description of a thin use case: validate
  input (a small `zod` schema per use case) -> call the repository -> map the result to a DTO. No
  SQL, no HTTP, no framework types anywhere in this folder.
- `infrastructure/database/` -- `pool.ts` (one `pg.Pool`, connecting as `rw_app`) and
  `with-actor-transaction.ts`, which every RLS-protected repository method wraps its query in: it
  runs `SELECT set_config('app.current_user_id', $1, true)` inside the transaction before the real
  query, which is what makes the RLS policies documented in `database/README.md` apply per-request.
  `infrastructure/auth/` and `infrastructure/sockets/` implement the remaining domain service
  interfaces (bcrypt, JWT, Socket.io).
- `presentation/` -- Express controllers/routes/middlewares. `middlewares/auth.middleware.ts` is
  the only place `req.userId` is ever set, and only from a JWT's verified `sub` claim -- never from
  request input, satisfying the "extract userId from the token only" requirement by construction,
  not by convention.
- `src/index.ts` -- the composition root: the only file that `new`s up concrete infrastructure
  classes and wires them into use cases and controllers. No DI container; wiring by hand is about
  25 lines for a codebase this size.

Dependency injection is therefore visible everywhere a class takes its collaborators through its
constructor, and every one of those collaborator types is an interface from `domain/`, not a
concrete infrastructure class -- the definition of the Dependency Inversion Principle, not just an
assertion of it.

## Backend: REST + WebSocket conventions

- **Errors**: every response error is `{ error: { code, message, correlationId } }`, produced by a
  single `error-handler.middleware.ts`. A known `AppError` subclass maps to its HTTP status
  (`ValidationError` -> 400, `UnauthorizedError` -> 401, `ForbiddenError` -> 403, `NotFoundError` ->
  404, `ConflictError` -> 409); anything else becomes a generic 500 with the real error only logged
  server-side, never leaked to the client.
- **Correlation id**: `correlation-id.middleware.ts` reuses an incoming `X-Correlation-Id` header or
  mints one with `crypto.randomUUID()`, echoes it on the response, and every error payload carries
  it -- one id to grep across client logs, server logs, and the error response shown to the user.
- **Pagination**: `GET /channels/:channelId/messages?cursor=...` is keyset, matching
  `database/queries/01_channel_history_keyset.sql` exactly -- `cursor` is a message's `seq`, never an
  `OFFSET`. `PgMessageRepository.listByChannel` fetches `limit + 1` rows and drops the extra one to
  compute `nextCursor`, rather than guessing "is this a full page" from the count alone.
- **Auth**: `POST /auth/register` and `/auth/login` return a short-lived access token in the JSON
  body (meant for an `Authorization: Bearer` header, never persisted to `localStorage` by the
  intended frontend usage) and set a refresh token as an `httpOnly`, `sameSite=lax` cookie (`secure`
  outside development). `POST /auth/refresh` reads that cookie and rotates both tokens. `req.userId`
  -- what every other route trusts as "who is making this request" -- is set in exactly one place,
  `auth.middleware.ts`, and only from the access token's verified `sub` claim.
- **WebSockets**: Socket.io authenticates once at handshake with the same access token
  (`socket.handshake.auth.token`), and a `channel:join` only succeeds -- silently no-oping otherwise
  -- if `ChannelRepository.findById(userId, channelId)` (the same RLS-protected lookup
  `GET /channels/:id` uses) returns a row. `MessagesController.send` broadcasts the new message to
  that channel's room (`channel:<id>`) only after the REST write has committed successfully, so the
  HTTP response and the socket event can never disagree about whether the send actually happened.

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
