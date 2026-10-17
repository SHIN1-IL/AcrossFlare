/**
 * Remote bootstrap: Docker + 3x-ui container.
 * Ubuntu uses apt. Alma/CentOS use the Docker CE repo.
 * Current 3x-ui images ignore XUI_USERNAME/XUI_PASSWORD and start as admin/admin.
 * After the database exists, the script stops the panel and writes this attempt's
 * username and password with `x-ui setting`, then starts it again.
 */
export function buildRemoteInstallScript(input: {
  panelUser: string;
  panelPassword: string;
  panelPort: number;
  vlessPort: number;
}) {
  const user = shellQuote(input.panelUser);
  const pass = shellQuote(input.panelPassword);
  const panelPort = Number(input.panelPort) || 2053;
  const vlessPort = Number(input.vlessPort) || 443;

  return `#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

if ! command -v docker >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    if [ ! -f /etc/apt/keyrings/docker.asc ]; then
      curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
      chmod a+r /etc/apt/keyrings/docker.asc
    fi
    . /etc/os-release
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io
    systemctl enable --now docker
  elif command -v dnf >/dev/null 2>&1 || command -v yum >/dev/null 2>&1; then
    if ! command -v curl >/dev/null 2>&1; then
      if command -v dnf >/dev/null 2>&1; then
        dnf install -y curl ca-certificates
      else
        yum install -y curl ca-certificates
      fi
    fi
    if [ ! -f /etc/yum.repos.d/docker-ce.repo ]; then
      if command -v dnf >/dev/null 2>&1; then
        dnf install -y dnf-plugins-core
        dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
      else
        yum install -y yum-utils
        yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
      fi
    fi
    if [ -f /etc/os-release ]; then
      . /etc/os-release
      major="\${VERSION_ID%%.*}"
      if [ -n "\$major" ] && [ -f /etc/yum.repos.d/docker-ce.repo ]; then
        sed -i "s/\\\\\\$releasever/\${major}/g" /etc/yum.repos.d/docker-ce.repo
      fi
    fi
    if command -v dnf >/dev/null 2>&1; then
      dnf install -y docker-ce docker-ce-cli containerd.io
    else
      yum install -y docker-ce docker-ce-cli containerd.io
    fi
    systemctl enable --now docker
  else
    echo "AF_BOOTSTRAP_NO_PACKAGE_MANAGER" >&2
    exit 1
  fi
fi

mkdir -p /etc/x-ui

systemctl stop x-ui xray >/dev/null 2>&1 || true
systemctl disable x-ui xray >/dev/null 2>&1 || true

if docker ps -a --format '{{.Names}}' | grep -qx 'acrossflare-3xui'; then
  docker rm -f acrossflare-3xui >/dev/null || true
fi
for cid in $(docker ps -aq); do
  if docker port "$cid" 2>/dev/null | grep -Eq ':443\\b|:${panelPort}\\b'; then
    docker rm -f "$cid" >/dev/null || true
  fi
done

free_listen() {
  port="$1"
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "\${port}/tcp" >/dev/null 2>&1 || true
  fi
  if command -v ss >/dev/null 2>&1; then
    for pid in $(ss -lptn "sport = :\${port}" 2>/dev/null | sed -n 's/.*pid=\\([0-9]*\\).*/\\1/p'); do
      kill -9 "$pid" >/dev/null 2>&1 || true
    done
  fi
}
free_listen ${vlessPort}
free_listen ${panelPort}
sleep 1

rm -rf /etc/x-ui
mkdir -p /etc/x-ui

docker run -d \\
  --name acrossflare-3xui \\
  --restart unless-stopped \\
  -p ${panelPort}:2053 \\
  -p ${vlessPort}:443 \\
  -v /etc/x-ui:/etc/x-ui \\
  ghcr.io/mhsanaei/3x-ui:latest

wait_panel() {
  for i in $(seq 1 60); do
    if curl -skf "https://127.0.0.1:${panelPort}/" >/dev/null 2>&1 || curl -sf "http://127.0.0.1:${panelPort}/" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

if ! wait_panel; then
  echo "AF_BOOTSTRAP_PANEL_TIMEOUT" >&2
  exit 1
fi

docker stop acrossflare-3xui >/dev/null

set +e
set_out=$(docker run --rm --entrypoint /app/x-ui \\
  -v /etc/x-ui:/etc/x-ui \\
  ghcr.io/mhsanaei/3x-ui:latest \\
  setting -username ${user} -password ${pass} -webBasePath / -resetTwoFactor 2>&1)
set_status=$?
set -e
printf '%s\\n' "$set_out"
if [ "$set_status" -ne 0 ] || ! printf '%s\\n' "$set_out" | grep -q "Username and password updated successfully"; then
  echo "AF_BOOTSTRAP_PANEL_USER_FAILED" >&2
  exit 1
fi

docker start acrossflare-3xui >/dev/null

if ! wait_panel; then
  echo "AF_BOOTSTRAP_PANEL_TIMEOUT" >&2
  exit 1
fi

echo "AF_BOOTSTRAP_PANEL_READY"
exit 0
`;
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
