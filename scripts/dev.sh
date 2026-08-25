#!/bin/sh
# macOS GUI apps (Cursor, Terminal) inherit launchctl maxfiles=256.
# Next.js watchers need far more or they die with EMFILE.
if ulimit -n 65536 >/dev/null 2>&1; then
  :
elif ulimit -n 10240 >/dev/null 2>&1; then
  :
fi

exec next dev --hostname 0.0.0.0 --port 3000 "$@"
