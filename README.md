# Internal Messaging Platform

Real-time internal messaging (a simplified Slack) with an AI copilot (RAG) that can only
retrieve context from channels the authenticated user is a member of. The permission filter
lives in SQL (Row Level Security), not in the application layer.

> Status: in progress. This README is filled in as each project phase advances (structure ->
> database -> backend -> frontend -> AI copilot).

## Stack

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, TanStack Query, Zustand,
  Socket.io-client, next-intl, React Hook Form + Zod.
- **Backend**: Node.js, Express, TypeScript, Clean Architecture, Socket.io, JWT (short-lived
  access token + refresh rotation), bcrypt.
- **Database**: PostgreSQL 15+ with pgvector, Row Level Security, keyset pagination.
- **AI**: RAG on top of pgvector, swappable provider (`AIProvider`), first implementation with
  the OpenAI SDK.

## Repo structure

```
/
├── docker-compose.yml
├── .env.example
├── frontend/        Next.js (App Router, TypeScript, Tailwind)
├── backend/          Node.js/Express, TypeScript, Clean Architecture
│   ├── scripts/       db:migrate / db:seed
│   └── src/
│       ├── domain/          pure entities and interfaces (no Express/pg)
│       ├── application/     use cases
│       ├── infrastructure/  DB, JWT, sockets, AI provider
│       └── presentation/    routes, controllers, middlewares
├── database/         ddl, functions, policies, migrations, seed.json
└── docs/             der, swagger/postman
```

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- For development without Docker: Node.js 20+, [Bun](https://bun.sh) 1.4+, PostgreSQL 15+ with
  the `pgvector` extension available

## Running the project (Docker, clean machine)

```bash
cp .env.example .env
# edit .env with your own values (passwords, JWT secrets, OPENAI_API_KEY)

docker compose up --build
```

Services:

| Service   | URL                     |
|-----------|--------------------------|
| Frontend  | http://localhost:3000    |
| Backend   | http://localhost:4000    |
| Postgres  | localhost:5432           |

## Migrations and seed data

```bash
# 1. Start the database
docker compose up -d db

# 2. Apply the schema (extensions, tables, functions, RLS policies)
cd backend && bun run db:migrate

# 3. Load database/seed.json (5 users, 3 channels, 10 messages -- see its _meta for the demo password)
bun run db:seed
```

`db:migrate` is a thin wrapper around the exact `psql` command validated in
[`database/README.md`](./database/README.md) (it needs the real `psql` binary for the `\ir`/`\if`
meta-commands the migration file uses, which is why it shells out to a `docker run` rather than
using a plain Postgres client library). `db:seed` is a real TypeScript script
(`backend/scripts/seed.ts`) and only ever runs once against a freshly migrated, empty database.

## Local development (without Docker)

```bash
# Backend (after migrate + seed above)
cd backend
bun install
bun run dev   # http://localhost:4000/health

# Frontend
cd frontend
bun install
bun run dev   # http://localhost:3000 -> redirects to /en/channels (or /es/channels)
```

Open http://localhost:3000 and log in with any seeded user's email (e.g. `ana@rewire.dev`) and the
demo password from `database/seed.json`'s `_meta`. The frontend talks to the real backend
(`frontend/lib/api/`): JWT login with silent refresh via httpOnly cookie, live messages over
Socket.io, and the copilot panel calling `POST /copilot/ask`. The original mock data layer it was
built against has been deleted -- see Phase 6 of [`DECISIONS.md`](./DECISIONS.md).

## API

Full OpenAPI 3.0 spec at [`docs/swagger/openapi.yaml`](./docs/swagger/openapi.yaml) (validated with
`redocly lint`, zero errors). Open [`docs/swagger/index.html`](./docs/swagger/index.html) in a
browser for an interactive Swagger UI over it (any static file server works, e.g.
`bunx --bun serve docs/swagger`). Quick reference, matching `backend/src/presentation/routes/`:

| Method | Path                              | Auth | Notes                                    |
|--------|------------------------------------|------|-------------------------------------------|
| POST   | `/auth/register`                   | --   | sets refresh cookie, returns access token |
| POST   | `/auth/login`                      | --   | same                                      |
| POST   | `/auth/refresh`                    | cookie | rotates both tokens                     |
| POST   | `/auth/logout`                     | --   | clears the refresh cookie                 |
| GET    | `/users/me`                        | yes  |                                            |
| PATCH  | `/users/me`                        | yes  | `{ fullName?, jobTitle? }`                |
| GET    | `/channels`                        | yes  | the caller's own channels (RLS)           |
| POST   | `/channels`                        | yes  | `{ name, description? }`                  |
| POST   | `/channels/:channelId/members`     | yes  | `{ userId }`, caller must already be a member |
| GET    | `/channels/:channelId/messages`    | yes  | `?cursor&limit`, keyset pagination        |
| POST   | `/channels/:channelId/messages`    | yes  | `{ content }`, also broadcasts over the socket |
| GET    | `/messages/search`                 | yes  | `?q&channelId?&limit`, `ts_headline` highlighted |
| PATCH  | `/messages/:messageId`             | yes  | author-only, enforced by RLS              |
| DELETE | `/messages/:messageId`             | yes  | soft delete, author-only, enforced by RLS |
| POST   | `/copilot/ask`                     | yes  | `{ question, channelId? }`, RAG answer with citations (503 if no `OPENAI_API_KEY`) |

WebSocket (Socket.io, same origin as the backend): connect with `auth: { token: accessToken }`,
then `socket.emit("channel:join", channelId, callback)` -- `callback(true)` only if the caller is
actually a member -- and listen for `"message:new"`.

## AI copilot

RAG over the caller's own channels, and only those: retrieval goes through
`rw_fn_copilot_context` (membership JOIN in SQL) executed under the caller's RLS transaction, so
the permission filter is enforced twice in the database and zero times in "please behave" prompt
text. The system prompt is versioned in [`backend/prompts/v1.md`](./backend/prompts/v1.md)
(append-only: new version = new file); answers cite sources as `[n]`, refuse honestly when the
channels contain nothing relevant, and treat retrieved messages as data -- never instructions
(prompt-injection defense). Every call is logged to `rw_copilot_usage_logs` with token counts.

Embeddings are generated by the backend after a message is created/edited (an OpenAI call can't
run inside a DB trigger), fire-and-forget so sending never blocks on the AI provider; the
search-vector trigger clears a stale embedding whenever content changes. To enable it: set a real
`OPENAI_API_KEY` in `backend/.env` (and `.env` for Docker), then embed the pre-existing messages
once:

```bash
cd backend && bun run ai:backfill
```

Without a key everything else works; `POST /copilot/ask` answers `503`.

## Tests

```bash
cd backend && bun test tests
```

Runs against the REAL PostgreSQL database (`docker compose up -d db` + migrate + seed first) as
the real `rw_app` role -- no mocks. They prove the non-negotiable isolation rules in SQL itself: a
non-member gets zero rows (and no error) reading a private channel, their INSERT is rejected by
RLS, full-text search leaks nothing, `rw_fn_copilot_context` returns nothing outside the caller's
memberships, and messages cannot be physically deleted even by their author. No `OPENAI_API_KEY`
needed.

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) -- architecture decisions and rationale.
- [`DECISIONS.md`](./DECISIONS.md) -- what was cut from the MVP due to time, and why.
- [`database/README.md`](./database/README.md) -- schema, normalization, RLS design.
- [`docs/der.pdf`](./docs/der.pdf) -- entity-relationship diagram, generated from the actual DDL.
- [`docs/swagger/openapi.yaml`](./docs/swagger/openapi.yaml) -- OpenAPI 3.0 spec (+ `index.html` for Swagger UI).
- `docs/postman/` -- still pending.
