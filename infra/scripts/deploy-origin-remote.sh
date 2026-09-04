#!/usr/bin/env bash
# Run on the origin VPS (any cwd). Uses docker compose only — no host npm/npx.
set -euo pipefail

COMPOSE=(docker compose --profile origin)

find_project_dir() {
  for d in "/opt/acrossflare-app" "$HOME/acrossflare-app" "/root/acrossflare-app"; do
    if [[ -f "$d/docker-compose.yml" && -d "$d/.git" ]]; then
      echo "$d"
      return 0
    fi
  done
  return 1
}

PROJECT_DIR="$(find_project_dir)" || {
  echo "ERROR: acrossflare-app not found under /opt, ~, or /root."
  echo "Clone: git clone https://github.com/SHIN1-IL/AcrossFlare.git /opt/acrossflare-app"
  exit 1
}

cd "$PROJECT_DIR"
echo "==> Project: $PROJECT_DIR"

echo "==> git pull"
git pull --ff-only origin main

if [[ -f .env ]]; then
  echo "==> .env production flags"
  grep -E '^(PROVISION_MODE|APP_URL|PAYMENT_MODE|TRAFFIC_SYNC_ENABLED|XUI_TLS_INSECURE)=' .env || true
  if grep -q '^PROVISION_MODE=simulate' .env 2>/dev/null; then
    echo "WARN: PROVISION_MODE=simulate — set live in .env before real provisioning."
  fi
else
  echo "WARN: .env missing — copy from .env.example before live use."
fi

echo "==> stop stale one-off web run containers (seed/build leftovers)"
docker ps -q --filter "name=acrossflare-web-run-" | xargs -r docker stop 2>/dev/null || true

echo "==> docker compose up --build (migrate runs via compose migrate service)"
"${COMPOSE[@]}" up -d --build

echo "==> seed plan defaults (idempotent upsert)"
"${COMPOSE[@]}" run --rm seed

echo "==> compose ps"
"${COMPOSE[@]}" ps

echo "==> traffic sync scheduler"
docker logs acrossflare-api-1 2>&1 | grep traffic_sync_scheduler_started || echo "WARN: traffic_sync_scheduler_started not in logs yet"

echo "==> health"
curl -sf https://acrossflare.com/api/health && echo || echo "WARN: health check failed"

if [[ -f .env ]] && grep -q '^CLOUDFLARE_API_TOKEN=' .env 2>/dev/null && grep -q '^CLOUDFLARE_ZONE_ID=' .env 2>/dev/null; then
  echo "==> Cloudflare cache rules"
  EDGE_ENV_FILE="$PROJECT_DIR/.env" bash "$PROJECT_DIR/infra/scripts/ensure-cloudflare-cache-rules.sh" || echo "WARN: cache rules update failed"
  echo "==> Cloudflare marketing purge"
  EDGE_ENV_FILE="$PROJECT_DIR/.env" bash "$PROJECT_DIR/infra/scripts/purge-cloudflare-cache.sh" || echo "WARN: purge failed"
else
  echo "==> skip Cloudflare purge (CLOUDFLARE_ZONE_ID / CLOUDFLARE_API_TOKEN not in .env)"
fi

echo "==> warm edge cache"
EDGE_ENV_FILE="$PROJECT_DIR/.env" bash "$PROJECT_DIR/infra/scripts/warm-edge-cache.sh" || echo "WARN: warm incomplete"

echo "==> done"
