#!/usr/bin/env bash
# Thin wrapper around the exact command validated in database/README.md.
# Not reimplemented in JS on purpose: database/migrations/0001_init.sql
# relies on psql meta-commands (\ir, \if, \gset) that a plain pg client
# library (node-pg included) cannot execute -- only the real psql binary
# understands them. Requires `docker compose up -d db` to already be
# running (for the "frank_default" network to exist).
set -euo pipefail
cd "$(dirname "$0")/../.."

if [ ! -f .env ]; then
  echo "ERROR: .env not found at repo root. Copy .env.example first." >&2
  exit 1
fi
set -a
source .env
set +a

docker run --rm --network frank_default \
  -e PGPASSWORD="$DB_ADMIN_PASSWORD" \
  -v "$(pwd)/database:/database" \
  pgvector/pgvector:pg16 \
  psql -h db -U "$DB_ADMIN_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 -v app_password="$DB_PASSWORD" \
  -f /database/migrations/0001_init.sql
