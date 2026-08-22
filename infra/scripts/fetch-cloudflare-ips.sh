#!/bin/sh
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/infra/nginx/cloudflare-real-ip.conf"

{
  echo "# Cloudflare published ranges. Refresh with infra/scripts/fetch-cloudflare-ips.sh"
  echo "# https://www.cloudflare.com/ips-v4  https://www.cloudflare.com/ips-v6"
  echo "# Only peers in this list may supply CF-Connecting-IP (spoofed headers from others are ignored)."
  echo
  curl -fsSL https://www.cloudflare.com/ips-v4 | sed 's/^/set_real_ip_from /; s/$/;/'
  echo
  curl -fsSL https://www.cloudflare.com/ips-v6 | sed 's/^/set_real_ip_from /; s/$/;/'
  echo
  echo "real_ip_header CF-Connecting-IP;"
  echo "real_ip_recursive on;"
} > "$OUT"

echo "Updated $OUT"
