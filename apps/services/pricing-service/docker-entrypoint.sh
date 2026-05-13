#!/bin/sh
# Bootstraps the pricing-service on first container start:
#   1. Runs pending TypeORM migrations.
#   2. Seeds trades + the partner craftsman (idempotent).
#   3. Hands off to the dev server.

set -e

echo "[pricing-service] running migrations…"
yarn migration:run

echo "[pricing-service] seeding…"
yarn seed || echo "[pricing-service] seed step finished with warnings (likely already seeded)"

echo "[pricing-service] starting…"
exec "$@"
