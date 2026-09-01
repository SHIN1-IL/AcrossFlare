#!/bin/sh
set -eu

if [ -n "${POSTGRES_PASSWORD:-}" ]; then
  DATABASE_URL="$(
    node -e 'process.stdout.write("postgresql://"+encodeURIComponent(process.env.POSTGRES_USER||"acrossflare")+":"+encodeURIComponent(process.env.POSTGRES_PASSWORD||"acrossflare")+"@postgres:5432/"+encodeURIComponent(process.env.POSTGRES_DB||"acrossflare"))'
  )"
  export DATABASE_URL
fi

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

exec node server.js
