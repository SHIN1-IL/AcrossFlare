#!/usr/bin/env bash
# Purge Cloudflare cache for marketing HTML URLs (batches of 30).
# Requires CLOUDFLARE_ZONE_ID + CLOUDFLARE_API_TOKEN (Cache Purge permission).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/infra/scripts/edge-common.sh"

edge_load_dotenv "${EDGE_ENV_FILE:-$ROOT/.env}"

if [[ -z "${CLOUDFLARE_ZONE_ID:-}" || -z "${CLOUDFLARE_API_TOKEN:-}" ]]; then
  echo "SKIP: set CLOUDFLARE_ZONE_ID and CLOUDFLARE_API_TOKEN to purge."
  exit 0
fi

echo "==> purge marketing URLs zone=$CLOUDFLARE_ZONE_ID"

batch=()
flush() {
  [[ "${#batch[@]}" -eq 0 ]] && return 0
  local json files i
  files=""
  for ((i = 0; i < ${#batch[@]}; i++)); do
    [[ -n "$files" ]] && files+=","
    files+="\"${batch[$i]}\""
  done
  json="{\"files\":[${files}]}"
  resp="$(curl -sS --max-time 30 -X POST \
    "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/purge_cache" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "$json")"
  if ! echo "$resp" | grep -q '"success":true'; then
    echo "ERROR: purge failed: $resp" >&2
    exit 1
  fi
  echo "purged ${#batch[@]}"
  batch=()
}

while IFS= read -r url; do
  batch+=("$url")
  if [[ "${#batch[@]}" -ge 30 ]]; then
    flush
  fi
done < <(edge_marketing_urls)
flush

echo "==> purge done"
