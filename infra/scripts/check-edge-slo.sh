#!/usr/bin/env bash
# Edge / origin SLO probe. Exits 1 on breach; optional Slack/Discord webhook.
#
# Defaults sized for a 2GB origin behind Cloudflare:
#   health TTFB <= 1500ms (origin always DYNAMIC)
#   marketing pages with cf-cache-status HIT <= 500ms
#   marketing HIT ratio across storefront URLs >= 70%
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/infra/scripts/edge-common.sh"

edge_load_dotenv "${EDGE_ENV_FILE:-$ROOT/.env}"

ORIGIN="$(edge_origin)"
HEALTH_MS="${EDGE_SLO_HEALTH_MS:-1500}"
HIT_MS="${EDGE_SLO_HIT_MS:-500}"
MIN_HIT_RATIO="${EDGE_SLO_MIN_HIT_RATIO:-70}"
TIMEOUT="${EDGE_SLO_TIMEOUT:-30}"

breach=0
lines=()

ms_from_seconds() {
  # $1 = seconds float from curl
  awk -v s="$1" 'BEGIN { printf "%d", (s * 1000) + 0.5 }'
}

alert() {
  local text="$1"
  lines+=("$text")
  echo "$text" >&2
  breach=1
}

note() {
  lines+=("$1")
  echo "$1"
}

# --- health (always origin) ---
health_url="$ORIGIN/api/health"
health_ttfb="$(curl -sS --max-time "$TIMEOUT" -o /dev/null -w '%{time_starttransfer}' "$health_url" || echo "99")"
health_ms="$(ms_from_seconds "$health_ttfb")"
if [[ "$health_ms" -gt "$HEALTH_MS" ]]; then
  alert "ALERT health TTFB ${health_ms}ms > ${HEALTH_MS}ms ($health_url)"
else
  note "OK    health TTFB ${health_ms}ms <= ${HEALTH_MS}ms"
fi

# --- marketing sample: all URLs ---
hit=0
total=0
slow_hit=0

while IFS= read -r url; do
  hdr="$(mktemp)"
  ttfb="$(curl -sS --max-time "$TIMEOUT" -o /dev/null -D "$hdr" -w '%{time_starttransfer}' "$url" || echo "99")"
  ms="$(ms_from_seconds "$ttfb")"
  status="$(grep -i '^cf-cache-status:' "$hdr" | awk '{print $2}' | tr -d '\r' || true)"
  rm -f "$hdr"
  total=$((total + 1))
  case "$status" in
    HIT|REVALIDATED)
      hit=$((hit + 1))
      if [[ "$ms" -gt "$HIT_MS" ]]; then
        alert "ALERT HIT slow ${ms}ms > ${HIT_MS}ms $url"
        slow_hit=$((slow_hit + 1))
      fi
      ;;
    *)
      note "INFO  ${status:-NONE} ${ms}ms $url"
      ;;
  esac
done < <(edge_marketing_urls)

ratio=0
if [[ "$total" -gt 0 ]]; then
  ratio=$((hit * 100 / total))
fi

if [[ "$ratio" -lt "$MIN_HIT_RATIO" ]]; then
  alert "ALERT marketing HIT ratio ${ratio}% < ${MIN_HIT_RATIO}% (${hit}/${total})"
else
  note "OK    marketing HIT ratio ${ratio}% (${hit}/${total})"
fi

summary="$(printf '%s\n' "${lines[@]}")"

if [[ "$breach" -ne 0 && -n "${SLO_ALERT_WEBHOOK_URL:-}" ]]; then
  body="AcrossFlare edge SLO"$'\n'"$summary"
  if command -v jq >/dev/null 2>&1; then
    payload="$(jq -n --arg t "$body" '{text:$t,content:$t}')"
  else
    escaped="${body//\\/\\\\}"
    escaped="${escaped//\"/\\\"}"
    escaped="${escaped//$'\n'/\\n}"
    payload="{\"text\":\"$escaped\",\"content\":\"$escaped\"}"
  fi
  curl -sS --max-time 15 -X POST -H 'Content-Type: application/json' \
    --data "$payload" "$SLO_ALERT_WEBHOOK_URL" >/dev/null || true
fi

[[ "$breach" -eq 0 ]]
