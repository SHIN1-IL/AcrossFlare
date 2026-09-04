#!/usr/bin/env bash
# Warm Cloudflare edge cache for all marketing locales/paths (GET, not HEAD).
# Safe to run from cron on the origin VPS — no host Node required.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/infra/scripts/edge-common.sh"

edge_load_dotenv "${EDGE_ENV_FILE:-$ROOT/.env}"

ORIGIN="$(edge_origin)"
TIMEOUT="${EDGE_WARM_TIMEOUT:-25}"
ok=0
fail=0
hits=0
misses=0

echo "==> warm edge cache origin=$ORIGIN"
while IFS= read -r url; do
  hdr="$(mktemp)"
  code="$(curl -sS -L --max-time "$TIMEOUT" -o /dev/null -D "$hdr" -w '%{http_code}' "$url" || true)"
  status="$(grep -i '^cf-cache-status:' "$hdr" | awk '{print $2}' | tr -d '\r' || true)"
  rm -f "$hdr"
  if [[ "$code" =~ ^2 ]]; then
    ok=$((ok + 1))
    case "$status" in
      HIT|REVALIDATED|EXPIRED) hits=$((hits + 1)) ;;
      *) misses=$((misses + 1)) ;;
    esac
    echo "OK  $code ${status:-?} $url"
  else
    fail=$((fail + 1))
    echo "ERR $code ${status:-?} $url" >&2
  fi
done < <(edge_marketing_urls)

echo "==> warm done ok=$ok fail=$fail cf_hitish=$hits other=$misses"
[[ "$fail" -eq 0 ]]
