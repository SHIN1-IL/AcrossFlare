#!/usr/bin/env bash
# Mac에서 Origin VPS로 배포. SSH 비밀번호는 시스템 팝업으로 입력합니다.
set -euo pipefail

ORIGIN_HOST="${ORIGIN_HOST:-root@167.179.86.16}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REMOTE_SCRIPT="$ROOT/infra/scripts/deploy-origin-remote.sh"

echo "==> AcrossFlare origin deploy → $ORIGIN_HOST"

if ! command -v expect >/dev/null 2>&1; then
  echo "ERROR: expect가 필요합니다. Xcode Command Line Tools를 설치하세요."
  exit 1
fi

PASSWORD="$(
  osascript \
    -e 'display dialog "Origin VPS SSH 비밀번호를 입력하세요." & return & return & "root@167.179.86.16" default answer "" with title "AcrossFlare 배포" with hidden answer with icon note buttons {"취소", "배포 시작"} default button "배포 시작"' \
    -e 'text returned of result'
)" || {
  echo "배포가 취소되었습니다."
  exit 1
}

if [[ -z "$PASSWORD" ]]; then
  echo "비밀번호가 비어 있습니다."
  exit 1
fi

export AF_SSH_PASS="$PASSWORD"
export AF_ORIGIN_HOST="$ORIGIN_HOST"
export AF_REMOTE_SCRIPT="$REMOTE_SCRIPT"

echo "==> SSH 연결 및 배포 진행 중..."
/usr/bin/expect <<'EXPECT'
set timeout 1200
set password $env(AF_SSH_PASS)
set host $env(AF_ORIGIN_HOST)
set script_path $env(AF_REMOTE_SCRIPT)

log_user 1

spawn bash -c "ssh -t -o StrictHostKeyChecking=accept-new -o PreferredAuthentications=password -o PubkeyAuthentication=no $host bash -s < $script_path"
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
