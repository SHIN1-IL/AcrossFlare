#!/usr/bin/env bash
# Apply PortOne live keys into origin .env and recreate web. Run on VPS.
set -euo pipefail

PATCH="${1:-/tmp/acrossflare-portone.env}"
find_project_dir() {
  for d in "/opt/acrossflare-app" "$HOME/acrossflare-app" "/root/acrossflare-app"; do
    if [ -f "$d/docker-compose.yml" ] && [ -f "$d/.env" ]; then
      echo "$d"
      return 0
    fi
  done
  return 1
}

PROJECT_DIR="$(find_project_dir)" || {
  echo "ERROR: project .env not found"
  exit 1
}

python3 - "$PROJECT_DIR/.env" "$PATCH" <<'PY'
import re, sys
from pathlib import Path

env_path = Path(sys.argv[1])
patch_path = Path(sys.argv[2])
keys = ("PAYMENT_MODE", "APP_URL", "PORTONE_STORE_ID", "PORTONE_CHANNEL_KEY", "PORTONE_WEBHOOK_SECRET")

def parse(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in text.splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        out[k.strip()] = v.strip()
    return out

patch = parse(patch_path.read_text())
missing = [k for k in keys if not patch.get(k)]
if missing:
    raise SystemExit(f"missing keys in patch: {', '.join(missing)}")

text = env_path.read_text()
updated = []
for key in keys:
    val = patch[key]
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.M)
    line = f"{key}={val}"
    if pattern.search(text):
        text = pattern.sub(line, text, count=1)
        updated.append(f"replaced {key}")
    else:
        if text and not text.endswith("\n"):
            text += "\n"
        text += line + "\n"
        updated.append(f"appended {key}")
env_path.write_text(text)
print("\n".join(updated))
print("env_ok")
PY

cd "$PROJECT_DIR"
echo "==> PAYMENT_MODE / APP_URL (no secrets)"
grep -E '^(PAYMENT_MODE|APP_URL)=' .env

echo "==> recreate web to pick up env"
docker compose --profile origin up -d --no-deps --force-recreate web

echo "==> done"
