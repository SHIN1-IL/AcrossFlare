#!/usr/bin/env bash
# Copy local login env keys to origin VPS and recreate web.
set -euo pipefail

ORIGIN_HOST="${ORIGIN_HOST:-root@167.179.86.16}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
LOCAL_ENV="$ROOT/.env"
REMOTE_SCRIPT="$ROOT/infra/scripts/apply-login-passwords-remote.sh"
PATCH="$(mktemp)"

cleanup() { rm -f "$PATCH"; }
trap cleanup EXIT

if [[ ! -f "$LOCAL_ENV" ]]; then
  echo "ERROR: $LOCAL_ENV missing"
  exit 1
fi

python3 - "$LOCAL_ENV" "$PATCH" <<'PY'
import sys
from pathlib import Path

src = Path(sys.argv[1])
dest = Path(sys.argv[2])
keys = ("ADMIN_OWNER_EMAIL", "ADMIN_OWNER_PASSWORD", "REVIEW_USER_EMAIL", "REVIEW_USER_PASSWORD")
vals = {}
for line in src.read_text().splitlines():
    s = line.strip()
    if not s or s.startswith("#") or "=" not in s:
        continue
    k, v = s.split("=", 1)
    vals[k.strip()] = v.strip().strip('"').strip("'")
missing = [k for k in keys if not vals.get(k)]
if missing:
    raise SystemExit(f"Set these in .env first: {', '.join(missing)}")
dest.write_text("".join(f'{k}="{vals[k]}"\n' for k in keys))
print("local_env_ok")
PY

if ! command -v expect >/dev/null 2>&1; then
  echo "ERROR: expect가 필요합니다."
  exit 1
fi

PASSWORD="$(
  osascript \
    -e 'display dialog "Origin VPS SSH 비밀번호를 입력하세요." & return & return & "login env 적용 (web 재생성)" default answer "" with title "AcrossFlare" with hidden answer with icon note buttons {"취소", "적용"} default button "적용"' \
    -e 'text returned of result'
)" || {
  echo "취소되었습니다."
  exit 1
}

export AF_SSH_PASS="$PASSWORD"
export AF_ORIGIN_HOST="$ORIGIN_HOST"
export AF_REMOTE_SCRIPT="$REMOTE_SCRIPT"
export AF_PATCH="$PATCH"

echo "==> SSH 연결 후 로그인 env 적용..."
/usr/bin/expect <<'EXPECT'
set timeout 300
set password $env(AF_SSH_PASS)
set host $env(AF_ORIGIN_HOST)
set script_path $env(AF_REMOTE_SCRIPT)
set patch $env(AF_PATCH)

log_user 1

spawn scp -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no $script_path $patch $host:/tmp/
expect {
  -re "(?i)password:" {
    send "$password\r"
    exp_continue
  }
  eof
}
catch wait result
if {[lindex $result 3] != 0} { exit [lindex $result 3] }

set patch_name [file tail $patch]
spawn ssh -t -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no $host "mv /tmp/$patch_name /tmp/acrossflare-login.env && sh /tmp/apply-login-passwords-remote.sh /tmp/acrossflare-login.env && rm -f /tmp/acrossflare-login.env /tmp/apply-login-passwords-remote.sh"
expect {
  -re "(?i)password:" {
    send "$password\r"
    exp_continue
  }
  eof
}
catch wait result
set exit_code [lindex $result 3]
if {$exit_code eq ""} { set exit_code 0 }
exit $exit_code
EXPECT

echo "==> 완료"
