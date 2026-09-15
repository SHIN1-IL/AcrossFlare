#!/usr/bin/env bash
# Disable marketing seed subscriptions that poll placeholder 3x-ui panels (traffic sync errors).
# Run on origin VPS: sh infra/scripts/fix-seed-marketing-sync.sh
set -euo pipefail

PG_CONTAINER="${PG_CONTAINER:-acrossflare-postgres}"
PG_USER="${POSTGRES_USER:-acrossflare}"
PG_DB="${POSTGRES_DB:-acrossflare}"

echo "==> Deactivate ACTIVE seed marketing subscriptions"
docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -v ON_ERROR_STOP=1 <<'SQL'
UPDATE "Subscription"
SET status = 'FAILED',
    memo = 'Seed marketing demo — disabled for traffic sync',
    "updatedAt" = NOW()
WHERE id LIKE 'seed_m_%'
  AND status = 'ACTIVE';
SQL

echo "==> Set placeholder marketing nodes OFFLINE (10.0.0.x only)"
docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -v ON_ERROR_STOP=1 <<'SQL'
UPDATE "Node"
SET status = 'OFFLINE',
    "updatedAt" = NOW()
WHERE id IN ('m-use-bw', 'm-usw-bw')
  AND host LIKE '10.0.0.%'
  AND status = 'ONLINE';
SQL

echo "==> Verify"
docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -c \
  "SELECT id, status, memo FROM \"Subscription\" WHERE id LIKE 'seed_m_%';"
docker exec "$PG_CONTAINER" psql -U "$PG_USER" -d "$PG_DB" -c \
  "SELECT id, host, status FROM \"Node\" WHERE id IN ('m-use-bw', 'm-usw-bw');"

echo "==> Recent traffic sync (wait up to 5 min for errors=0)"
docker logs acrossflare-api-1 --since 10m 2>&1 | grep -E 'traffic_sync_(complete|node_failed)' | tail -10 || true

echo "==> done"
