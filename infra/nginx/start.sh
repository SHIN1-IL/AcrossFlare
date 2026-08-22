#!/bin/sh
set -eu

CERT_DIR="${CERT_DIR:-/etc/nginx/certs}"
SNIPPETS="${SNIPPETS:-/etc/nginx/snippets}"
PULLS_CONF="${PULLS_CONF:-/etc/nginx/origin-pulls.conf}"

if [ ! -f "$CERT_DIR/origin.pem" ] || [ ! -f "$CERT_DIR/origin.key" ]; then
  echo "acrossflare-nginx: missing Cloudflare Origin CA ($CERT_DIR/origin.pem, origin.key)" >&2
  echo "Place the dashboard-issued Origin CA here, or run infra/scripts/gen-dev-origin-certs.sh" >&2
  exit 1
fi

chmod 644 "$CERT_DIR/origin.pem" 2>/dev/null || true
chmod 600 "$CERT_DIR/origin.key" 2>/dev/null || true

ORIGIN_PULLS="${ORIGIN_PULLS:-on}"
if [ "$ORIGIN_PULLS" = "off" ] || [ "$ORIGIN_PULLS" = "0" ]; then
  cp "$SNIPPETS/origin-pulls.off.conf" "$PULLS_CONF"
  echo "acrossflare-nginx: Authenticated Origin Pulls disabled"
else
  if [ ! -f "$CERT_DIR/authenticated_origin_pull_ca.pem" ]; then
    echo "acrossflare-nginx: fetching Cloudflare Authenticated Origin Pull CA"
    wget -qO "$CERT_DIR/authenticated_origin_pull_ca.pem" \
      "https://developers.cloudflare.com/ssl/static/authenticated_origin_pull_ca.pem"
  fi
  cp "$SNIPPETS/origin-pulls.on.conf" "$PULLS_CONF"
fi

nginx -t
exec nginx -g "daemon off;"
