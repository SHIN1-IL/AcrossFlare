#!/usr/bin/env bash
# Shared marketing URL list for warm / purge / SLO. Keep suffixes in sync with src/lib/marketing-urls.ts.
set -euo pipefail

LOCALES=(en ko zh ja)
SUFFIXES=("" /standard /hybrid /workspace /pricing /terms /privacy /login /signup)

edge_origin() {
  local raw
  if [[ -n "${EDGE_ORIGIN:-}" ]]; then
    raw="$EDGE_ORIGIN"
  elif [[ -n "${APP_URL:-}" && "$APP_URL" != http://localhost* && "$APP_URL" != http://127.0.0.1* ]]; then
    raw="$APP_URL"
  else
    raw="https://acrossflare.com"
  fi
  echo "$raw" | sed 's:/*$::'
}

edge_marketing_urls() {
  local origin locale suffix
  origin="$(edge_origin)"
  for locale in "${LOCALES[@]}"; do
    for suffix in "${SUFFIXES[@]}"; do
      printf '%s/%s%s\n' "$origin" "$locale" "$suffix"
    done
  done
}

# Load selected keys from a dotenv file without eval'ing the whole file.
edge_load_dotenv() {
  local file="${1:-}"
  [[ -n "$file" && -f "$file" ]] || return 0
  local line key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^(APP_URL|CLOUDFLARE_ZONE_ID|CLOUDFLARE_API_TOKEN|SLO_ALERT_WEBHOOK_URL|EDGE_SLO_HEALTH_MS|EDGE_SLO_HIT_MS|EDGE_ORIGIN)= ]] || continue
    key="${line%%=*}"
    value="${line#*=}"
    value="${value%\"}"
    value="${value#\"}"
    value="${value%\'}"
    value="${value#\'}"
    export "$key=$value"
  done <"$file"
}
