import { randomBytes } from "node:crypto";
import { withBackupNotice } from "@/lib/provision/subscription";

const EXIT_IPS = ["203.0.113.10", "203.0.113.44", "198.51.100.22", "198.51.100.87", "192.0.2.55"];

export function yamlUrlFor(token: string, origin: string) {
  return `${origin.replace(/\/$/, "")}/api/v1/subscription/${token}`;
}

export function karingDeepLink(yamlUrl: string) {
  return `karing://install-config?url=${encodeURIComponent(yamlUrl)}`;
}

export function buildVlessYaml(nodes: string[], uuid: string) {
  const proxies = nodes
    .map((host, index) => {
      const name = host.split(".")[0] ?? `node-${index}`;
      return [
        `  - name: ${name}`,
        `    type: vless`,
        `    server: ${host}`,
        `    port: 443`,
        `    uuid: ${uuid}`,
        `    network: ws`,
        `    tls: true`,
        `    udp: true`,
        `    ws-opts:`,
        `      path: /vless`,
      ].join("\n");
    })
    .join("\n");

  return withBackupNotice(`# AcrossFlare subscription\n# Content-Type: text/yaml\nproxies:\n${proxies}\n`);
}

export function newYamlToken() {
  return randomBytes(16).toString("hex");
}

export function newClientUuid() {
  return crypto.randomUUID();
}

export function xuiClientEmail(subscriptionId: string) {
  return `af_${subscriptionId.replace(/[^a-zA-Z0-9]/g, "").slice(-12)}`;
}

export function vaultUserId(subscriptionId: string) {
  return `af_${subscriptionId.replace(/[^a-zA-Z0-9]/g, "").slice(-16)}`;
}

export function syncthingFolderId(subscriptionId: string) {
  return `af-${subscriptionId.replace(/[^a-zA-Z0-9]/g, "").slice(-12).toLowerCase()}`;
}

export function newSecret(bytes = 12) {
  return randomBytes(bytes).toString("base64url");
}

export function defaultExitIp(seed: string) {
  const index = Number.parseInt(tokenFrom(seed, 4), 16) % EXIT_IPS.length;
  return EXIT_IPS[index] ?? EXIT_IPS[0];
}

function tokenFrom(input: string, length = 12) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash).toString(16).padStart(length, "0").slice(0, length);
}
