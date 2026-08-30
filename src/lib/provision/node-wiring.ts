export type NodeWiring = "placeholder" | "local" | "ready";

const SEED_PASSWORD = "seed-only";
const DOC_NETS = [
  [192, 0, 2],
  [198, 51, 100],
  [203, 0, 113],
] as const;

export function panelHostname(host: string) {
  return host.trim().replace(/^https?:\/\//i, "").split("/")[0]?.split(":")[0]?.toLowerCase() ?? "";
}

function ipv4Parts(value: string) {
  const parts = value.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }
  return parts as [number, number, number, number];
}

export function isLocalPanelHost(host: string) {
  const name = panelHostname(host);
  if (!name) {
    return false;
  }
  if (name === "localhost" || name.endsWith(".localhost") || name === "host.docker.internal") {
    return true;
  }
  const parts = ipv4Parts(name);
  return Boolean(parts && parts[0] === 127);
}

export function isPlaceholderPanelHost(host: string) {
  const name = panelHostname(host);
  const parts = ipv4Parts(name);
  if (!parts) {
    return false;
  }

  const [a, b] = parts;
  if (a === 10 || a === 0) {
    return true;
  }
  if (a === 192 && b === 168) {
    return true;
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }
  return DOC_NETS.some(([na, nb, nc]) => a === na && b === nb && parts[2] === nc);
}

export function nodeWiring(input: { host: string; password?: string | null }): NodeWiring {
  if ((input.password ?? "") === SEED_PASSWORD) {
    return "placeholder";
  }
  if (isLocalPanelHost(input.host)) {
    return "local";
  }
  if (isPlaceholderPanelHost(input.host)) {
    return "placeholder";
  }
  return "ready";
}
