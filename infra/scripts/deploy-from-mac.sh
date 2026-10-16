#!/usr/bin/env bash
# Mac에서 Origin VPS로 배포. SSH 비밀번호는 시스템 팝업으로 입력합니다.
set -euo pipefail

ORIGIN_HOST="${ORIGIN_HOST:-root@167.179.86.16}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REMOTE_SCRIPT="$ROOT/infra/scripts/deploy-origin-remote.sh"

echo "==> AcrossFlare origin deploy → $ORIGIN_HOST"

# The origin image runs a fresh `next build` typecheck. Local tsc is incremental
# and can miss the error that then fails docker compose on the VPS.
echo "==> lint before origin build (same gate as GitHub CI web job)"
if ! (cd "$ROOT" && npm run lint); then
  echo "ERROR: lint가 실패했습니다. CI/web과 동일하게 막습니다. 오리진 빌드를 시작하지 않습니다."
  exit 1
fi

echo "==> typecheck before origin build"
if ! (cd "$ROOT" && npm run typecheck); then
  echo "ERROR: 타입 검사가 실패했습니다. 오리진 빌드를 시작하지 않습니다."
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
AF_GEMINI_KEY="$(grep -E '^GEMINI_API_KEY=' "$ROOT/.env" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^"//; s/"$//' || true)"
AF_GEMINI_MODEL="$(grep -E '^GEMINI_MODEL=' "$ROOT/.env" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^"//; s/"$//' || true)"
AF_REMOTE_BODY="$(mktemp)"
AF_ASKPASS="$(mktemp)"
{
  printf 'export GEMINI_API_KEY=%q\nexport GEMINI_MODEL=%q\n' "$AF_GEMINI_KEY" "${AF_GEMINI_MODEL:-gemini-3.5-flash-lite}"
  cat "$REMOTE_SCRIPT"
} > "$AF_REMOTE_BODY"
AF_SSH_PASS="$PASSWORD" python3 - "$AF_ASKPASS" << 'PY'
import os, pathlib, shlex, sys
path = pathlib.Path(sys.argv[1])
path.write_text("#!/bin/sh\nprintf '%s\\n' " + shlex.quote(os.environ["AF_SSH_PASS"]) + "\n")
path.chmod(0o700)
PY
trap 'rm -f "$AF_REMOTE_BODY" "$AF_ASKPASS"' EXIT
export SSH_ASKPASS="$AF_ASKPASS"
export SSH_ASKPASS_REQUIRE=force
export DISPLAY="${DISPLAY:-:0}"

echo "==> SSH 연결 및 배포 진행 중..."
ssh -o StrictHostKeyChecking=accept-new \
  -o PreferredAuthentications=password \
  -o PubkeyAuthentication=no \
  -o NumberOfPasswordPrompts=1 \
  "$ORIGIN_HOST" bash -s < "$AF_REMOTE_BODY"

echo "==> 완료"
