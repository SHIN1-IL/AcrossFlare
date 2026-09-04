#!/usr/bin/env bash
# Install crontab entries for edge warm (10m) + SLO check (5m) on the origin VPS.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WARM="$ROOT/infra/scripts/warm-edge-cache.sh"
SLO="$ROOT/infra/scripts/check-edge-slo.sh"
LOG_DIR="${EDGE_LOG_DIR:-/var/log/acrossflare}"

chmod +x "$WARM" "$SLO" "$ROOT/infra/scripts/purge-cloudflare-cache.sh" \
  "$ROOT/infra/scripts/edge-common.sh" 2>/dev/null || true

if [[ "$(id -u)" -eq 0 ]]; then
  mkdir -p "$LOG_DIR"
else
  LOG_DIR="${TMPDIR:-/tmp}/acrossflare-edge-logs"
  mkdir -p "$LOG_DIR"
  echo "WARN: not root — logs at $LOG_DIR"
fi

MARKER_BEGIN="# acrossflare-edge-begin"
MARKER_END="# acrossflare-edge-end"

existing="$(crontab -l 2>/dev/null || true)"
filtered="$(printf '%s\n' "$existing" | awk -v b="$MARKER_BEGIN" -v e="$MARKER_END" '
  $0 == b {skip=1; next}
  $0 == e {skip=0; next}
  !skip {print}
')"

tmp="$(mktemp)"
{
  printf '%s\n' "$filtered"
  echo "$MARKER_BEGIN"
  echo "*/10 * * * * EDGE_ENV_FILE=$ROOT/.env $WARM >>$LOG_DIR/warm.log 2>&1"
  echo "*/5 * * * * EDGE_ENV_FILE=$ROOT/.env $SLO >>$LOG_DIR/slo.log 2>&1"
  echo "$MARKER_END"
} | awk 'NF || !blank++' >"$tmp"

crontab "$tmp"
rm -f "$tmp"

echo "==> installed edge crontab"
crontab -l | sed -n "/$MARKER_BEGIN/,/$MARKER_END/p"
echo "==> first warm (may take ~1–2 min on cold origin)"
EDGE_ENV_FILE="$ROOT/.env" "$WARM" || true
echo "==> done"
