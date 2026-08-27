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

Validated commands (see [`database/README.md`](./database/README.md) for the full rationale):

```bash
# 1. Start the database
docker compose up -d db

# 2. Apply the schema (extensions, tables, functions, RLS policies)
docker run --rm --network frank_default \
  -e PGPASSWORD="$DB_ADMIN_PASSWORD" \
  -v "$(pwd)/database:/database" \
  pgvector/pgvector:pg16 \
  psql -h db -U "$DB_ADMIN_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 -v app_password="$DB_PASSWORD" \
  -f /database/migrations/0001_init.sql
```

> A `bun run db:migrate` / `bun run db:seed` wrapper around this, plus the `database/seed.json`
> loader, ships in the backend phase.

## Local development (without Docker)

```bash
# Backend
cd backend
bun install
bun run dev   # http://localhost:4000/health

# Frontend
cd frontend
bun install
bun run dev   # http://localhost:3000 -> redirects to /en/channels (or /es/channels)
```

> The frontend was built ahead of the backend API, at the user's request: its data layer
> (`frontend/lib/mock/`) currently simulates the backend (same shapes as the real endpoints,
> artificial latency, a simulated send-failure rate) using the same users/channels/messages as
> `database/seed.json`. Log in isn't wired up yet -- the mock session is always "Ana Perez". See the
> Phase 3 section of [`DECISIONS.md`](./DECISIONS.md) for what that means and doesn't mean for
> security.

## Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) -- architecture decisions and rationale.
- [`DECISIONS.md`](./DECISIONS.md) -- what was cut from the MVP due to time, and why.
- [`database/README.md`](./database/README.md) -- schema, normalization, RLS design.
- `docs/der.pdf` -- entity-relationship diagram (pending).
- `docs/swagger/` and `docs/postman/` -- API documentation (pending).
