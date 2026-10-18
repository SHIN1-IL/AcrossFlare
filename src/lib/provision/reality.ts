/** VLESS flow for REALITY inbounds (3x-ui + Karing / Clash Meta). */
export const VLESS_CLIENT_FLOW = "xtls-rprx-vision";

/** Karing/mihomo report an old core version; empty minClientVer on Xray 26.7.11+ rejects them. */
export const REALITY_MIN_CLIENT_VER = "1.0.0";

export const DEFAULT_VLESS_PORT = 443;

const IPV4 = /(?:https?:\/\/)?(\d{1,3}(?:\.\d{1,3}){3})/;

export type RealityFields = {
  realityPublicKey?: string | null;
  realityShortId?: string | null;
  realityServerName?: string | null;
  realityFingerprint?: string | null;
};

export function vlessConnectHost(node: { ddns: string; host?: string | null }) {
  const match = (node.host ?? "").trim().match(IPV4);
  if (match?.[1]) {
    return match[1];
  }
  return node.ddns.trim();
}

export function hasRealityConfig(node: RealityFields) {
  return Boolean(node.realityPublicKey?.trim() && node.realityServerName?.trim());
}

export function assertRealityConfigured(nodes: RealityFields[], label = "node") {
  const missing = nodes.filter((node) => !hasRealityConfig(node));
  if (missing.length) {
    throw new Error(`${label}_reality_not_configured`);
  }
}

export function applyRealityInboundDefaults(reality: Record<string, unknown>) {
  reality.minClientVer = REALITY_MIN_CLIENT_VER;
  reality.minClient = REALITY_MIN_CLIENT_VER;
  return reality;
}

/**
 * Xray `x25519` and Karing/mihomo decode REALITY keys with raw URL-safe base64
 * (43 chars, no `=` padding). Standard base64 fails as
 * `decode public_key: illegal base64 data at input byte 43`.
 */
export function realityKeyForClient(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) {
    return "";
  }
  const standard = raw.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (standard.length % 4)) % 4;
  const padded = padLength ? `${standard}${"=".repeat(padLength)}` : standard;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(padded)) {
    return raw;
  }
  const bytes = Buffer.from(padded, "base64");
  if (bytes.length !== 32) {
    return raw;
  }
  return bytes.toString("base64url");
}

function nestedRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Same key bytes, encoded the way Xray and Karing decode them. */
export function canonicalizeRealityInbound(reality: Record<string, unknown>) {
  let changed = false;
  if (String(reality.minClientVer ?? "").trim() !== REALITY_MIN_CLIENT_VER) {
    reality.minClientVer = REALITY_MIN_CLIENT_VER;
    changed = true;
  }
  if (String(reality.minClient ?? "").trim() !== REALITY_MIN_CLIENT_VER) {
    reality.minClient = REALITY_MIN_CLIENT_VER;
    changed = true;
  }

  const privateKey = String(reality.privateKey ?? "").trim();
  if (privateKey) {
    const canonical = realityKeyForClient(privateKey);
    if (canonical !== privateKey) {
      reality.privateKey = canonical;
      changed = true;
    }
  }

  const settings = nestedRecord(reality.settings);
  const publicKey = String(settings?.publicKey ?? "").trim();
  if (settings && publicKey) {
    const canonical = realityKeyForClient(publicKey);
    if (canonical !== publicKey) {
      settings.publicKey = canonical;
      reality.settings = settings;
      changed = true;
    }
  }

  return changed;
}
