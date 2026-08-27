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

Log in with any seeded user's email (e.g. `ana@rewire.dev`) and the demo password from
`database/seed.json`'s `_meta`.

> The frontend's data layer (`frontend/lib/mock/`) was built ahead of the backend API and still
> simulates it as of this writing -- wiring it up to the real endpoints above is the next step, not
> done yet. See the Phase 3 section of [`DECISIONS.md`](./DECISIONS.md) for what the mock does and
> doesn't prove about security in the meantime.

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

WebSocket (Socket.io, same origin as the backend): connect with `auth: { token: accessToken }`,
then `socket.emit("channel:join", channelId, callback)` -- `callback(true)` only if the caller is
actually a member -- and listen for `"message:new"`.

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) -- architecture decisions and rationale.
- [`DECISIONS.md`](./DECISIONS.md) -- what was cut from the MVP due to time, and why.
- [`database/README.md`](./database/README.md) -- schema, normalization, RLS design.
- [`docs/der.pdf`](./docs/der.pdf) -- entity-relationship diagram, generated from the actual DDL.
- [`docs/swagger/openapi.yaml`](./docs/swagger/openapi.yaml) -- OpenAPI 3.0 spec (+ `index.html` for Swagger UI).
- `docs/postman/` -- still pending.
