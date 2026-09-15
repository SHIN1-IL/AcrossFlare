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
