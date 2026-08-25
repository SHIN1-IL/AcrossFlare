#!/bin/sh
# 1GB swap for the 1GB RAM origin VPS. Safe to re-run.
set -eu

SWAPFILE="${SWAPFILE:-/swapfile}"
SIZE="${SWAP_SIZE:-1G}"

if swapon --show | grep -q "$SWAPFILE"; then
  echo "Swap already active: $SWAPFILE"
  exit 0
fi

if [ ! -f "$SWAPFILE" ]; then
  fallocate -l "$SIZE" "$SWAPFILE" 2>/dev/null || dd if=/dev/zero of="$SWAPFILE" bs=1M count=1024
  chmod 600 "$SWAPFILE"
  mkswap "$SWAPFILE"
fi

swapon "$SWAPFILE"

if ! grep -q "$SWAPFILE" /etc/fstab; then
  echo "$SWAPFILE none swap sw 0 0" >> /etc/fstab
fi

echo "Swap ready: $SWAPFILE ($SIZE)"
