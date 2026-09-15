#!/usr/bin/env bash
# Patch origin .env login passwords and recreate web. Run on VPS.
# Usage: sh apply-login-passwords-remote.sh /tmp/acrossflare-login.env
set -euo pipefail

PATCH="${1:-/tmp/acrossflare-login.env}"
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
keys = ("ADMIN_OWNER_EMAIL", "ADMIN_OWNER_PASSWORD", "REVIEW_USER_EMAIL", "REVIEW_USER_PASSWORD")

def parse(text: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for line in text.splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
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
    line = f'{key}="{val}"'
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
echo "==> login emails (no passwords)"
grep -E '^(ADMIN_OWNER_EMAIL|REVIEW_USER_EMAIL)=' .env

echo "==> recreate web to pick up env"
docker compose --profile origin up -d --no-deps --force-recreate web

echo "==> done"
