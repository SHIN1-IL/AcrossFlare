#!/usr/bin/env bash
# Run on your Mac. Opens SSH to origin VPS, pulls latest main, rebuilds containers.
set -euo pipefail

ORIGIN_HOST="${ORIGIN_HOST:-root@167.179.86.16}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "==> Deploying AcrossFlare to $ORIGIN_HOST"
echo "    (GitHub main should already include commit 7b60e36+)"
echo ""

exec ssh -t -o StrictHostKeyChecking=accept-new "$ORIGIN_HOST" 'bash -s' <"$ROOT/infra/scripts/deploy-origin-remote.sh"
