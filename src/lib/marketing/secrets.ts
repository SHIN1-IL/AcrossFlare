import { generateKeyPairSync, randomBytes } from "node:crypto";
import type { Node } from "@prisma/client";
import {
  DEFAULT_HTTP_PORT,
  DEFAULT_SOCKS_PORT,
  DEFAULT_WG_PORT,
  WG_SUBNET,
  marketingHttpPort,
  marketingSocksPort,
  marketingWgPort,
  SIMULATED_WG_SERVER_PUBLIC_KEY,
  wgServerPublicKey,
} from "./config";

export const EXIT_IPS = ["203.0.113.10", "203.0.113.44", "198.51.100.22", "198.51.100.87", "192.0.2.55"];

export type MarketingSecrets = {
  exitIp: string;
  httpUser: string;
  httpPass: string;
  httpPort: number;
  socksPort: number;
  wgPrivateKey: string;
  wgPublicKey: string;
  wgClientPublicKey: string;
  wgAddress: string;
  wgEndpointPort: number;
};

export function generateWireGuardKeys() {
  const client = x25519Pair();
  const configured = wgServerPublicKey();

  if (process.env.PROVISION_MODE === "live" && !configured) {
    throw new Error("wg_server_public_key_missing");
  }

  return {
    privateKey: client.privateKey,
    publicKey: configured || SIMULATED_WG_SERVER_PUBLIC_KEY,
    clientPublicKey: client.publicKey,
  };
}

export function nextExitIp(current: string) {
  const index = EXIT_IPS.indexOf(current);
  return EXIT_IPS[(index + 1) % EXIT_IPS.length] ?? EXIT_IPS[0];
}

export function isPublicIpv4(value: string) {
  const parts = value.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) {
    return false;
  }
  if (a === 192 && b === 168) {
    return false;
  }
  if (a === 172 && b !== undefined && b >= 16 && b <= 31) {
    return false;
  }

  return true;
}

export function exitHostFor(node: Node | null | undefined, pool: Node[] = []) {
  if (!node) {
    return null;
  }

  if (isPublicIpv4(node.host)) {
    return node.host;
  }

  const index = Math.max(0, pool.findIndex((item) => item.id === node.id));
  return EXIT_IPS[index % EXIT_IPS.length] ?? EXIT_IPS[0];
}

export function regionFrom(node: Node | null | undefined, fallback = "US-East") {
  if (!node) {
    return fallback;
  }

  return node.name.replace(/\s+(Bandwagon|Racknerd)$/i, "").trim() || node.name;
}

export function pickNextNode(currentId: string | undefined, pool: Node[]) {
  if (!pool.length) {
    return null;
  }

  const currentIndex = pool.findIndex((node) => node.id === currentId);
  return pool[(currentIndex + 1) % pool.length] ?? pool[0];
}

export function nextWgAddress(used: Array<string | null | undefined>) {
  const taken = new Set(used.filter((value): value is string => Boolean(value)));

  for (let host = 2; host <= 254; host += 1) {
    const address = `${WG_SUBNET}.${host}/32`;
    if (!taken.has(address)) {
      return address;
    }
  }

  throw new Error("wg_pool_exhausted");
}

export function issueMarketingSecrets(input: {
  exitIp: string;
  httpUser?: string;
  wgAddress: string;
}): MarketingSecrets {
  const keys = generateWireGuardKeys();

  return {
    exitIp: input.exitIp,
    httpUser: input.httpUser ?? `af${randomBytes(3).toString("hex")}`,
    httpPass: randomBytes(12).toString("base64url"),
    httpPort: marketingHttpPort(),
    socksPort: marketingSocksPort(),
    wgPrivateKey: keys.privateKey,
    wgPublicKey: keys.publicKey,
    wgClientPublicKey: keys.clientPublicKey,
    wgAddress: input.wgAddress,
    wgEndpointPort: marketingWgPort(),
  };
}

function x25519Pair() {
  const { privateKey, publicKey } = generateKeyPairSync("x25519");
  const privDer = privateKey.export({ type: "pkcs8", format: "der" });
  const pubDer = publicKey.export({ type: "spki", format: "der" });

  return {
    privateKey: Buffer.from(privDer).subarray(-32).toString("base64"),
    publicKey: Buffer.from(pubDer).subarray(-32).toString("base64"),
  };
}

export { DEFAULT_HTTP_PORT, DEFAULT_SOCKS_PORT, DEFAULT_WG_PORT };
