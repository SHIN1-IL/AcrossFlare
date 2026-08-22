#!/bin/sh
set -eu

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DIR="$ROOT/infra/certs"
mkdir -p "$DIR"

openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
  -keyout "$DIR/origin.key" \
  -out "$DIR/origin.pem" \
  -subj "/CN=acrossflare.com" \
  -addext "subjectAltName=DNS:acrossflare.com,DNS:www.acrossflare.com,DNS:files.acrossflare.com"

echo "Wrote $DIR/origin.pem and origin.key (self-signed)."
echo "Cloudflare Full (Strict) needs a dashboard Origin CA in production."
echo "Local origin tests: ORIGIN_PULLS=off npm run origin:up"
