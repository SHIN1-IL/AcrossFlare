import { NodeRole } from "@prisma/client";
import { randomBytes } from "node:crypto";
import {
  DEFAULT_VLESS_PORT,
  hasRealityConfig,
  VLESS_CLIENT_FLOW,
  type RealityFields,
} from "@/lib/provision/reality";
import { withBackupNotice } from "@/lib/provision/subscription";

const EXIT_IPS = ["203.0.113.10", "203.0.113.44", "198.51.100.22", "198.51.100.87", "192.0.2.55"];

export type YamlNode = {
  ddns: string;
  role: NodeRole;
  vlessPort?: number | null;
} & RealityFields;

export function prismaNodeToYamlNode(node: {
  ddns: string;
  role: NodeRole;
  vlessPort?: number | null;
  realityPublicKey?: string | null;
  realityShortId?: string | null;
  realityServerName?: string | null;
  realityFingerprint?: string | null;
}): YamlNode {
  return {
    ddns: node.ddns,
    role: node.role,
    vlessPort: node.vlessPort ?? DEFAULT_VLESS_PORT,
    realityPublicKey: node.realityPublicKey,
    realityShortId: node.realityShortId,
    realityServerName: node.realityServerName,
    realityFingerprint: node.realityFingerprint,
  };
}

export function yamlUrlFor(token: string, origin: string) {
  return `${origin.replace(/\/$/, "")}/api/v1/subscription/${token}`;
}

export function karingDeepLink(yamlUrl: string) {
  return `karing://install-config?url=${encodeURIComponent(yamlUrl)}`;
}

export function pickNodesForYaml(nodes: YamlNode[], failover: boolean) {
  if (!nodes.length) {
    return [];
  }

  if (failover) {
    const racknerd = nodes.filter((node) => node.role === NodeRole.RACKNERD);
    return racknerd.length ? racknerd : nodes;
  }

  const bandwagon = nodes.filter((node) => node.role === NodeRole.BANDWAGON);
  return bandwagon.length ? bandwagon : nodes;
}

/** @deprecated Use pickNodesForYaml */
export function pickHostsForYaml(nodes: YamlNode[], failover: boolean) {
  return pickNodesForYaml(nodes, failover).map((node) => node.ddns);
}

export function buildVlessYamlFromNodes(nodes: YamlNode[], uuid: string, failover: boolean) {
  return buildVlessYaml(pickNodesForYaml(nodes, failover), uuid, { refreshHint: failover });
}

function proxyName(node: YamlNode, index: number) {
  return node.ddns.split(".")[0] ?? `node-${index}`;
}

function buildRealityProxy(node: YamlNode, uuid: string, index: number) {
  const port = node.vlessPort ?? DEFAULT_VLESS_PORT;
  const lines = [
    `  - name: ${proxyName(node, index)}`,
    `    type: vless`,
    `    server: ${node.ddns}`,
    `    port: ${port}`,
    `    uuid: ${uuid}`,
    `    network: tcp`,
    `    tls: false`,
    `    udp: true`,
    `    flow: ${VLESS_CLIENT_FLOW}`,
    `    servername: ${node.realityServerName}`,
    `    reality-opts:`,
    `      public-key: ${node.realityPublicKey}`,
  ];

  if (node.realityShortId?.trim()) {
    lines.push(`      short-id: ${node.realityShortId.trim()}`);
  }
  if (node.realityFingerprint?.trim()) {
    lines.push(`    client-fingerprint: ${node.realityFingerprint.trim()}`);
  }

  return lines.join("\n");
}

function buildWsProxy(node: YamlNode, uuid: string, index: number) {
  const port = node.vlessPort ?? DEFAULT_VLESS_PORT;
  return [
    `  - name: ${proxyName(node, index)}`,
    `    type: vless`,
    `    server: ${node.ddns}`,
    `    port: ${port}`,
    `    uuid: ${uuid}`,
    `    network: ws`,
    `    tls: true`,
    `    udp: true`,
    `    ws-opts:`,
    `      path: /vless`,
  ].join("\n");
}

function buildProxyBlock(node: YamlNode, uuid: string, index: number) {
  return hasRealityConfig(node) ? buildRealityProxy(node, uuid, index) : buildWsProxy(node, uuid, index);
}

export function buildVlessYaml(nodes: YamlNode[], uuid: string, options?: { refreshHint?: boolean }) {
  const proxies = nodes.map((node, index) => buildProxyBlock(node, uuid, index)).join("\n");

  return withBackupNotice(
    `# AcrossFlare subscription\n# Content-Type: text/yaml\nproxies:\n${proxies}\n`,
    { refreshHint: options?.refreshHint },
  );
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
