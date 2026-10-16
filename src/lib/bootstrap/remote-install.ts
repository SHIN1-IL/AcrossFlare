/**
 * Ubuntu-first remote bootstrap: Docker + 3x-ui container.
 * Panel creds are set via env on first create; idempotent if container already exists.
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
fi

mkdir -p /etc/x-ui

if docker ps -a --format '{{.Names}}' | grep -qx 'acrossflare-3xui'; then
  docker start acrossflare-3xui >/dev/null || true
else
  docker run -d \\
    --name acrossflare-3xui \\
    --restart unless-stopped \\
    -e XUI_USERNAME=${user} \\
    -e XUI_PASSWORD=${pass} \\
    -p ${panelPort}:2053 \\
    -p ${vlessPort}:443 \\
    -v /etc/x-ui:/etc/x-ui \\
    ghcr.io/mhsanaei/3x-ui:latest
fi

# Wait for panel HTTP
for i in $(seq 1 60); do
  if curl -skf "https://127.0.0.1:${panelPort}/" >/dev/null 2>&1 || curl -sf "http://127.0.0.1:${panelPort}/" >/dev/null 2>&1; then
    echo "AF_BOOTSTRAP_PANEL_READY"
    exit 0
  fi
  sleep 2
done

echo "AF_BOOTSTRAP_PANEL_TIMEOUT" >&2
exit 1
`;
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
