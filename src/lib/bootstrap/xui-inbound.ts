import { randomBytes } from "node:crypto";
import {
  DEFAULT_VLESS_PORT,
  applyRealityInboundDefaults,
  realityKeyForClient,
} from "@/lib/provision/reality";
import { probeXuiPanel, isTlsProtocolMismatch, type XuiPanelTarget } from "@/lib/provision/xui";
import { generateRealityKeyPair, generateRealityShortId } from "@/lib/bootstrap/reality-keys";

export type BootstrapRealityResult = {
  inboundId: number;
  vlessPort: number;
  realityPublicKey: string;
  realityShortId: string;
  realityServerName: string;
  realityFingerprint: string;
};

type XuiJson = { success?: boolean; msg?: string; obj?: unknown };

function setCookiePairs(response: Response) {
  const cookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : response.headers.get("set-cookie")
        ? [response.headers.get("set-cookie") as string]
        : [];
  return cookies.map((item) => item.split(";")[0]?.trim() ?? "").filter(Boolean);
}

/** Later cookies with the same name replace earlier ones. The panel rejects the API when the pre-login cookie is sent first. */
function mergeCookiePairs(existing: string, incoming: string[]) {
  const jar = new Map<string, string>();
  for (const part of existing.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq > 0) {
      jar.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
    }
  }
  for (const pair of incoming) {
    const eq = pair.indexOf("=");
    if (eq > 0) {
      jar.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
  }
  return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

async function loginAndRequest(node: XuiPanelTarget, path: string, init?: RequestInit) {
  // Reuse probe login path by dynamically importing internals via public API surface:
  // We call list through probe, then add/update with duplicated fetch using password login.
  const { xuiApiToken, xuiTlsInsecure } = await import("@/lib/provision/config");
  const { Agent } = await import("undici");

  let base =
    node.host.startsWith("http://") || node.host.startsWith("https://")
      ? node.host.replace(/\/$/, "")
      : `${node.port === 443 || node.port === 2053 ? "https" : "http"}://${node.host}:${node.port}`;

  const dispatcher =
    xuiTlsInsecure()
      ? new Agent({ connect: { rejectUnauthorized: false } })
      : undefined;

  async function rawFetch(url: string, requestInit: RequestInit) {
    const send = (target: string) =>
      fetch(target, {
        ...requestInit,
        redirect: "manual",
        signal: AbortSignal.timeout(20_000),
        ...(dispatcher ? { dispatcher } : {}),
      } as RequestInit);
    try {
      return await send(url);
    } catch (error) {
      if (!url.startsWith("https://") || !isTlsProtocolMismatch(error)) {
        throw error;
      }
      base = `http://${base.slice("https://".length)}`;
      return await send(`http://${url.slice("https://".length)}`);
    }
  }

  const token = xuiApiToken();
  let cookie = "";
  let csrf = "";
  const bearer = token || "";

  if (!token) {
    const boot = await rawFetch(`${base}/`, { method: "GET" });
    const html = await boot.text();
    csrf = html.match(/name="csrf-token"\s+content="([^"]+)"/)?.[1] ?? "";
    cookie = mergeCookiePairs("", setCookiePairs(boot));

    const login = await rawFetch(`${base}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookie,
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
      },
      body: JSON.stringify({ username: node.username, password: node.password }),
    });
    cookie = mergeCookiePairs(cookie, setCookiePairs(login));
    const loginBody = (await login.json().catch(() => null)) as XuiJson | null;
    if (loginBody?.success === false) {
      throw new Error(loginBody.msg || "login_failed");
    }
  }

  const headers: Record<string, string> = { Accept: "application/json" };
  if (bearer) {
    headers.Authorization = `Bearer ${bearer}`;
  }
  if (cookie) {
    headers.Cookie = cookie;
  }
  if (csrf) {
    headers["X-CSRF-Token"] = csrf;
  }
  if (init?.body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await rawFetch(`${base}${path}`, { ...init, headers: { ...headers, ...(init?.headers as object) } });
  const body = (await response.json().catch(() => null)) as XuiJson | null;
  if (!response.ok || body?.success === false) {
    throw new Error(body?.msg || `xui_${path}_${response.status}`);
  }
  return body;
}

function asObj(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Prefer an existing REALITY inbound (never rotate privateKey). Otherwise create one.
 */
export async function ensureBootstrapRealityInbound(
  node: XuiPanelTarget,
  input: {
    vlessPort?: number;
    realityDest: string;
    remark?: string;
  }
): Promise<BootstrapRealityResult> {
  const destHost = input.realityDest.trim().replace(/:\d+$/, "") || "www.microsoft.com";
  if (/cloudflare/i.test(destHost)) {
    throw new Error("reality_dest_cloudflare_forbidden");
  }

  const listed = await loginAndRequest(node, "/panel/api/inbounds/list");
  const rows = Array.isArray(listed?.obj) ? listed.obj : [];

  for (const item of rows) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const inbound = item as Record<string, unknown>;
    if (String(inbound.protocol ?? "").toLowerCase() !== "vless") {
      continue;
    }
    const stream = asObj(inbound.streamSettings);
    if (String(stream.security ?? "").toLowerCase() !== "reality") {
      continue;
    }
    const reality = asObj(stream.realitySettings);
    const privateKey = String(reality.privateKey ?? "").trim();
    if (!privateKey) {
      continue;
    }

    applyRealityInboundDefaults(reality);
    const publicKey =
      String(reality.publicKey ?? "").trim() ||
      String(asObj(reality.settings).publicKey ?? "").trim();
    const shortIds = Array.isArray(reality.shortIds)
      ? reality.shortIds.map(String)
      : String(reality.shortIds ?? "")
          .split(",")
          .map((part) => part.trim());
    const shortId = shortIds.find((id) => id.length > 0) || generateRealityShortId();
    if (!shortIds.includes(shortId)) {
      reality.shortIds = [...shortIds.filter(Boolean), shortId];
    }

    const serverNames = Array.isArray(reality.serverNames)
      ? reality.serverNames.map(String)
      : [destHost];
    if (!serverNames.includes(destHost)) {
      serverNames.push(destHost);
    }
    reality.serverNames = serverNames;
    if (!String(reality.dest ?? "").trim()) {
      reality.dest = `${destHost}:443`;
    }

    stream.realitySettings = reality;
    stream.security = "reality";
    const sniff = asObj(inbound.sniffing);
    sniff.enabled = false;
    sniff.destOverride = [];

    const updated = {
      ...inbound,
      streamSettings: JSON.stringify(stream),
      sniffing: JSON.stringify(sniff),
      settings:
        typeof inbound.settings === "string" ? inbound.settings : JSON.stringify(inbound.settings ?? {}),
    };

    await loginAndRequest(node, `/panel/api/inbounds/update/${inbound.id}`, {
      method: "POST",
      body: JSON.stringify(updated),
    });

    const settingsPub = realityKeyForClient(
      publicKey ||
        String(asObj(asObj(stream.realitySettings).settings).publicKey ?? "").trim()
    );
    if (!settingsPub) {
      throw new Error("reality_public_key_missing");
    }

    return {
      inboundId: Number(inbound.id),
      vlessPort: Number(inbound.port) || DEFAULT_VLESS_PORT,
      realityPublicKey: settingsPub,
      realityShortId: shortId,
      realityServerName: destHost,
      realityFingerprint: "chrome",
    };
  }

  const keys = generateRealityKeyPair();
  const shortId = generateRealityShortId();
  const vlessPort = input.vlessPort ?? DEFAULT_VLESS_PORT;
  const remark = input.remark || `af-reality-${randomBytes(2).toString("hex")}`;

  const realitySettings = applyRealityInboundDefaults({
    show: false,
    xver: 0,
    dest: `${destHost}:443`,
    serverNames: [destHost],
    privateKey: keys.privateKey,
    shortIds: ["", shortId],
    settings: {
      publicKey: keys.publicKey,
      fingerprint: "chrome",
      serverName: "",
      spiderX: "/",
    },
  });

  const streamSettings = {
    network: "tcp",
    security: "reality",
    externalProxy: [],
    realitySettings,
    tcpSettings: {
      acceptProxyProtocol: false,
      header: { type: "none" },
    },
  };

  const payload = {
    up: 0,
    down: 0,
    total: 0,
    remark,
    enable: true,
    expiryTime: 0,
    listen: "",
    port: vlessPort,
    protocol: "vless",
    settings: JSON.stringify({
      clients: [],
      decryption: "none",
      fallbacks: [],
    }),
    streamSettings: JSON.stringify(streamSettings),
    sniffing: JSON.stringify({
      enabled: false,
      destOverride: [],
      metadataOnly: false,
      routeOnly: false,
    }),
    allocate: JSON.stringify({ strategy: "always", refresh: 5, concurrency: 3 }),
  };

  await loginAndRequest(node, "/panel/api/inbounds/add", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  const after = await probeXuiPanel(node);
  if (!after.ok) {
    throw new Error(after.error);
  }
  const created = after.inbounds.find(
    (row) => row.protocol.toLowerCase().includes("vless") && row.port === vlessPort
  );
  if (!created) {
    throw new Error("reality_inbound_create_failed");
  }

  return {
    inboundId: created.id,
    vlessPort,
    realityPublicKey: realityKeyForClient(keys.publicKey),
    realityShortId: shortId,
    realityServerName: destHost,
    realityFingerprint: "chrome",
  };
}
