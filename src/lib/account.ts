import { getPlanById, type ProductId } from "@/lib/plans";

export type ScenarioId =
  | "global-user"
  | "marketing-user"
  | "both-user"
  | "exhausted-user"
  | "unpaid-user";

export type SubscriptionStatus = "active" | "unpaid" | "provisioning";
export type PaymentMethod = "card" | "alipay";

export const SCENARIO_ACCOUNTS: { id: ScenarioId; email: string }[] = [
  { id: "global-user", email: "global-user@acrossflare.com" },
  { id: "marketing-user", email: "marketing-user@acrossflare.com" },
  { id: "both-user", email: "both-user@acrossflare.com" },
  { id: "exhausted-user", email: "exhausted-user@acrossflare.com" },
  { id: "unpaid-user", email: "unpaid-user@acrossflare.com" },
];

const EXIT_IPS = [
  "203.0.113.10",
  "203.0.113.44",
  "198.51.100.22",
  "198.51.100.87",
  "192.0.2.55",
];

const ROTATE_COOLDOWN_MS = 15_000;

export type Receipt = {
  id: string;
  date: string;
  product: ProductId;
  planId: string;
};

export type GlobalAccount = {
  status: SubscriptionStatus;
  planId: string;
  planName: string;
  expiresAt: string;
  trafficUsedGb: number;
  trafficLimitGb: number;
  failover: boolean;
  nodes: string[];
  uuid: string;
  deepLink: string;
  yamlUrl: string;
  yamlBody: string;
  nextcloudUrl: string;
  nextcloudUsedGb: number;
  nextcloudLimitGb: number;
  nextcloudAppPassword: string;
};

export type MarketingAccount = {
  status: SubscriptionStatus;
  planId: string;
  planName: string;
  expiresAt: string;
  exitIp: string;
  region: string;
  lastRotateAt: string | null;
  rotateLockedUntil: number | null;
  httpUser: string;
  httpPass: string;
  httpPort: number;
  socksPort: number;
  wgPrivateKey: string;
  wgPublicKey: string;
  wgAddress: string;
  wgEndpointPort: number;
};

export type AccountSnapshot = {
  email: string;
  scenario: ScenarioId;
  global: GlobalAccount | null;
  marketing: MarketingAccount | null;
  method: PaymentMethod;
  receipts: Receipt[];
};

export type AccountOverlay = {
  extraProducts?: ProductId[];
  extraPlanIds?: Partial<Record<ProductId, string>>;
  provisioning?: ProductId[];
  marketing?: {
    exitIp: string;
    lastRotateAt: string | null;
    rotateLockedUntil: number | null;
  };
  method?: PaymentMethod;
};

function tokenFrom(input: string, length = 12) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash).toString(16).padStart(length, "0").slice(0, length);
}

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function fakeKey(seed: string) {
  let n = Number.parseInt(tokenFrom(seed, 8), 16);
  let out = "";
  for (let i = 0; i < 43; i += 1) {
    n = Math.imul(n ^ (i + 1), 16777619) >>> 0;
    out += B64[n % 64];
  }
  return `${out}=`;
}

function uuidFrom(email: string) {
  const hex = `${tokenFrom(email, 8)}${tokenFrom(`${email}:uuid`, 16)}`;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(16, 19)}-${hex.slice(19, 31)}`;
}

export function scenarioFromEmail(email: string): ScenarioId {
  const local = email.split("@")[0]?.toLowerCase() ?? "";

  if (local === "global-user") {
    return "global-user";
  }
  if (local === "marketing-user") {
    return "marketing-user";
  }
  if (local === "exhausted-user") {
    return "exhausted-user";
  }
  if (local === "unpaid-user") {
    return "unpaid-user";
  }
  if (local === "both-user" || local === "user" || local === "admin") {
    return "both-user";
  }

  return "unpaid-user";
}

function seedProducts(scenario: ScenarioId): ProductId[] {
  switch (scenario) {
    case "global-user":
    case "exhausted-user":
      return ["global"];
    case "marketing-user":
      return ["marketing"];
    case "both-user":
      return ["global", "marketing"];
    default:
      return [];
  }
}

function seedPlanId(product: ProductId, scenario: ScenarioId) {
  if (product === "global") {
    return scenario === "exhausted-user" ? "global-pro" : "global-standard";
  }
  return "marketing-standard";
}

function buildYaml(email: string, nodes: string[], uuid: string) {
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

  return `# AcrossFlare subscription\n# Content-Type: text/yaml\nproxies:\n${proxies}\n`;
}

function buildGlobal(email: string, planId: string, scenario: ScenarioId): GlobalAccount {
  const plan = getPlanById(planId);
  const uuid = uuidFrom(email);
  const token = tokenFrom(`${email}:yaml`);
  const nodes = (plan?.nodes.length ? plan.nodes : ["SG"]).map(
    (code) => `node-${code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.acrossflare.com`
  );
  const failover = scenario === "exhausted-user";
  const yamlUrl = `https://sub.acrossflare.com/v1/yaml/${token}`;

  return {
    status: "active",
    planId,
    planName: plan?.name ?? "Standard",
    expiresAt: "2026-09-21T00:00:00.000Z",
    trafficUsedGb: failover ? 150 : 98,
    trafficLimitGb: 150,
    failover,
    nodes,
    uuid,
    deepLink: `karing://install-config?url=${encodeURIComponent(yamlUrl)}`,
    yamlUrl,
    yamlBody: buildYaml(email, nodes, uuid),
    nextcloudUrl: "https://files.acrossflare.com",
    nextcloudUsedGb: failover ? 8.4 : 6.1,
    nextcloudLimitGb: plan?.backupGb ?? 1,
    nextcloudAppPassword: `nc_${tokenFrom(`${email}:nc`, 4)}-${tokenFrom(`${email}:nc2`, 4)}-${tokenFrom(`${email}:nc3`, 4)}`,
  };
}

function defaultExitIp(email: string) {
  const index = Number.parseInt(tokenFrom(email, 4), 16) % EXIT_IPS.length;
  return EXIT_IPS[index] ?? EXIT_IPS[0];
}

function buildMarketing(
  email: string,
  planId: string,
  overlay: AccountOverlay["marketing"]
): MarketingAccount {
  const plan = getPlanById(planId);
  const region = plan?.nodes[0] ?? "US-East";
  const token = tokenFrom(`${email}:px`);
  const exitIp = overlay?.exitIp ?? defaultExitIp(email);

  return {
    status: "active",
    planId,
    planName: plan?.name ?? "Standard",
    expiresAt: "2026-09-21T00:00:00.000Z",
    exitIp,
    region,
    lastRotateAt: overlay?.lastRotateAt ?? "2026-08-18T09:12:00.000Z",
    rotateLockedUntil: overlay?.rotateLockedUntil ?? null,
    httpUser: `af${token.slice(0, 6)}`,
    httpPass: `px_${tokenFrom(`${email}:pass`, 8)}`,
    httpPort: 8080,
    socksPort: 1080,
    wgPrivateKey: fakeKey(`${email}:wg-private`),
    wgPublicKey: fakeKey(`${email}:wg-public`),
    wgAddress: "10.8.0.12/32",
    wgEndpointPort: 51820,
  };
}

export function nextExitIp(current: string) {
  const index = EXIT_IPS.indexOf(current);
  return EXIT_IPS[(index + 1) % EXIT_IPS.length] ?? EXIT_IPS[0];
}

export function rotateCooldownMs() {
  return ROTATE_COOLDOWN_MS;
}

export function httpProxyUrl(account: MarketingAccount) {
  return `http://${account.httpUser}:${account.httpPass}@${account.exitIp}:${account.httpPort}`;
}

export function socksProxyUrl(account: MarketingAccount) {
  return `socks5://${account.httpUser}:${account.httpPass}@${account.exitIp}:${account.socksPort}`;
}

export function wireGuardConfig(account: MarketingAccount) {
  return [
    "[Interface]",
    `PrivateKey = ${account.wgPrivateKey}`,
    `Address = ${account.wgAddress}`,
    "DNS = 1.1.1.1",
    "",
    "[Peer]",
    `PublicKey = ${account.wgPublicKey}`,
    `Endpoint = ${account.exitIp}:${account.wgEndpointPort}`,
    "AllowedIPs = 0.0.0.0/0, ::/0",
    "PersistentKeepalive = 25",
    "",
  ].join("\n");
}

export function resolveAccount(email: string, overlay: AccountOverlay = {}): AccountSnapshot {
  const scenario = scenarioFromEmail(email);
  const products = new Set<ProductId>([...seedProducts(scenario), ...(overlay.extraProducts ?? [])]);
  const provisioning = new Set(overlay.provisioning ?? []);

  const globalPlanId = overlay.extraPlanIds?.global ?? seedPlanId("global", scenario);
  const marketingPlanId = overlay.extraPlanIds?.marketing ?? seedPlanId("marketing", scenario);

  let global: GlobalAccount | null = products.has("global")
    ? buildGlobal(email, globalPlanId, scenario)
    : null;
  let marketing: MarketingAccount | null = products.has("marketing")
    ? buildMarketing(email, marketingPlanId, overlay.marketing)
    : null;

  if (global && provisioning.has("global")) {
    global = { ...global, status: "provisioning" };
  }
  if (marketing && provisioning.has("marketing")) {
    marketing = { ...marketing, status: "provisioning" };
  }

  const receipts: Receipt[] = [];
  if (global && global.status === "active") {
    receipts.push({
      id: `rcpt_${tokenFrom(`${email}:g`, 6)}`,
      date: "2026-07-22T00:00:00.000Z",
      product: "global",
      planId: global.planId,
    });
  }
  if (marketing && marketing.status === "active") {
    receipts.push({
      id: `rcpt_${tokenFrom(`${email}:m`, 6)}`,
      date: "2026-07-22T00:00:00.000Z",
      product: "marketing",
      planId: marketing.planId,
    });
  }

  return {
    email,
    scenario,
    global,
    marketing,
    method: overlay.method ?? "card",
    receipts,
  };
}
