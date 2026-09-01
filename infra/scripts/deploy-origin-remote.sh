#!/usr/bin/env bash
set -euo pipefail

find_project_dir() {
  for d in "$HOME/acrossflare-app" "/root/acrossflare-app" "/opt/acrossflare-app"; do
    if [[ -d "$d/.git" ]]; then
      echo "$d"
      return 0
    fi
  done
  return 1
}

PROJECT_DIR="$(find_project_dir)" || {
  echo "ERROR: acrossflare-app git repo not found."
  echo "Clone first: git clone https://github.com/SHIN1-IL/AcrossFlare.git ~/acrossflare-app"
  exit 1
}

cd "$PROJECT_DIR"
echo "==> Project: $PROJECT_DIR"

echo "==> git pull"
git pull --ff-only

echo "==> prisma migrate deploy"
npx prisma migrate deploy

if [[ -f .env ]]; then
  echo "==> .env production flags"
  grep -E '^(PROVISION_MODE|APP_URL|PAYMENT_MODE|TRAFFIC_SYNC_ENABLED)=' .env || true
  if grep -q '^PROVISION_MODE=simulate' .env 2>/dev/null; then
    echo "WARN: PROVISION_MODE=simulate — switch to live in .env before real provisioning."
  fi
else
  echo "WARN: .env missing — copy from .env.example before live use."
fi

echo "==> origin:up (docker rebuild)"
npm run origin:up

echo "==> traffic sync scheduler"
docker logs acrossflare-api-1 2>&1 | grep traffic_sync_scheduler_started || echo "WARN: traffic_sync_scheduler_started not found yet"

echo "==> health"
curl -sf https://acrossflare.com/api/health && echo || echo "WARN: health check failed"

echo "==> done"
