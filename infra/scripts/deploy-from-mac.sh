#!/usr/bin/env bash
# Mac에서 Origin VPS로 배포. SSH 비밀번호는 시스템 팝업으로 입력합니다.
set -euo pipefail

ORIGIN_HOST="${ORIGIN_HOST:-root@167.179.86.16}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ASKPASS_SCRIPT="$(mktemp)"
trap 'rm -f "$ASKPASS_SCRIPT"' EXIT

echo "==> AcrossFlare origin deploy → $ORIGIN_HOST"

PASSWORD="$(
  osascript <<'APPLESCRIPT' || true
display dialog "Origin VPS SSH 비밀번호

root@167.179.86.16" default answer "" with title "AcrossFlare 배포" with hidden answer buttons {"취소", "배포 시작"} default button "배포 시작"
if button returned of result is "취소" then error number -128
text returned of result
APPLESCRIPT
)" || {
  echo "배포가 취소되었습니다."
  exit 1
}

if [[ -z "$PASSWORD" ]]; then
  echo "비밀번호가 비어 있습니다."
  exit 1
fi

export AF_SSH_PASS="$PASSWORD"
cat >"$ASKPASS_SCRIPT" <<'EOF'
#!/bin/sh
printf '%s' "$AF_SSH_PASS"
EOF
chmod 700 "$ASKPASS_SCRIPT"

export SSH_ASKPASS="$ASKPASS_SCRIPT"
export SSH_ASKPASS_REQUIRE=force
export DISPLAY="${DISPLAY:-:0}"

echo "==> SSH 연결 및 배포 진행 중..."
ssh -t -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no "$ORIGIN_HOST" 'bash -s' <"$ROOT/infra/scripts/deploy-origin-remote.sh"

echo "==> 완료"
