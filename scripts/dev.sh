#!/bin/sh
# macOS GUI apps (Cursor, Terminal) inherit launchctl maxfiles=256.
# Next.js watchers need far more or they die with EMFILE.
if ulimit -n 65536 >/dev/null 2>&1; then
  :
elif ulimit -n 10240 >/dev/null 2>&1; then
  :
fi

# Bind IPv6 (::). Node dual-stacks this on macOS so localhost (::1) and 127.0.0.1 both work.
exec next dev --hostname :: --port 3000 "$@"
