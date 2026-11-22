export type ChinaReachability = "unknown" | "open" | "blocked" | "down" | "partial";

const CHINA_SAMPLE_MIN = 3;

export function publicIpv4(value: string): string | null {
  const match = value.match(/(?:https?:\/\/)?(\d{1,3}(?:\.\d{1,3}){3})/);
  if (!match) {
    return null;
  }
  const parts = match[1].split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return null;
  }
  const [a, b] = parts;
  if (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  ) {
    return null;
  }
  return match[1];
}

function connectPort(vlessPort: number, entryPort?: number | null) {
  if (entryPort != null && entryPort > 0 && entryPort <= 65535) {
    return entryPort;
  }
  return vlessPort > 0 && vlessPort <= 65535 ? vlessPort : 443;
}

/** Address Karing uses, which is the address a China block applies to. */
export function customerConnectTarget(node: {
  host: string;
  ddns: string;
  vlessPort: number;
  entryHost?: string | null;
  entryPort?: number | null;
}): { host: string; port: number } | null {
  const port = connectPort(node.vlessPort, node.entryPort);
  const entry = (node.entryHost ?? "").trim();
  if (entry) {
    if (entry.includes("/") || entry.endsWith(".local")) {
      return null;
    }
    return { host: entry, port };
  }
  const ip = publicIpv4(node.host);
  if (ip) {
    return { host: ip, port };
  }
  const ddns = node.ddns.trim().toLowerCase();
  if (!ddns || ddns.includes("/") || !ddns.includes(".") || ddns.endsWith(".local")) {
    return null;
  }
  return { host: ddns, port };
}

export function tcpProbeSucceeded(result: number): boolean | null {
  if (result === 1) {
    return false;
  }
  if (result === 0 || result > 1) {
    return true;
  }
  return null;
}

export function classifyChinaReachability(input: {
  china: Array<boolean | null>;
  overseas: Array<boolean | null>;
  chinaListed?: number;
}): ChinaReachability {
  const china = input.china.filter((sample): sample is boolean => sample !== null);
  const overseas = input.overseas.filter((sample): sample is boolean => sample !== null);
  const chinaNeeded = Math.min(CHINA_SAMPLE_MIN, input.chinaListed ?? CHINA_SAMPLE_MIN);
  if (china.length < chinaNeeded || overseas.length === 0) {
    return "unknown";
  }
  if (!overseas.some(Boolean)) {
    return "down";
  }
  const opened = china.filter(Boolean).length;
  if (opened === 0) {
    return "blocked";
  }
  if (opened === china.length) {
    return "open";
  }
  return "partial";
}

export function shouldNotifyChinaBlock(previous: ChinaReachability, next: ChinaReachability) {
  return next === "blocked" && previous !== "blocked";
}

export function chinaReachabilityRank(status: ChinaReachability) {
  switch (status) {
    case "blocked":
      return 0;
    case "partial":
      return 1;
    case "down":
      return 2;
    case "unknown":
      return 3;
    default:
      return 4;
  }
}
