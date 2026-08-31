/** VLESS flow for REALITY inbounds (3x-ui + Karing / Clash Meta). */
export const VLESS_CLIENT_FLOW = "xtls-rprx-vision";

export const DEFAULT_VLESS_PORT = 443;

export type RealityFields = {
  realityPublicKey?: string | null;
  realityShortId?: string | null;
  realityServerName?: string | null;
  realityFingerprint?: string | null;
};

export function hasRealityConfig(node: RealityFields) {
  return Boolean(node.realityPublicKey?.trim() && node.realityServerName?.trim());
}

export function assertRealityConfigured(nodes: RealityFields[], label = "node") {
  const missing = nodes.filter((node) => !hasRealityConfig(node));
  if (missing.length) {
    throw new Error(`${label}_reality_not_configured`);
  }
}
