import type { Node } from "@prisma/client";
import { Agent } from "undici";
import { xuiApiToken, xuiTlsInsecure } from "@/lib/provision/config";
import { VLESS_CLIENT_FLOW } from "@/lib/provision/reality";

export class XuiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XuiError";
  }
}

export type XuiPanelTarget = {
  id?: string;
  host: string;
  port: number;
  username: string;
  password: string;
  inboundId?: number | null;
};

export type XuiInboundSummary = {
  id: number;
  protocol: string;
  port: number;
  remark: string;
  enable: boolean;
};

type XuiClientInput = {
  uuid: string;
  email: string;
  expiresAt: Date;
  trafficGb: number | null;
};

type XuiJson = {
  success?: boolean;
  msg?: string;
  obj?: unknown;
};

function panelBase(node: XuiPanelTarget) {
  if (node.host.startsWith("http://") || node.host.startsWith("https://")) {
    return node.host.replace(/\/$/, "");
  }

  const scheme = node.port === 443 || node.port === 2053 ? "https" : "http";
  return `${scheme}://${node.host}:${node.port}`;
}

type XuiSession = {
  baseUrl: string;
  cookie: string;
  csrf: string;
  bearer: string;
};

function mergeCookies(...parts: string[]) {
  const jar = new Map<string, string>();
  for (const part of parts) {
    for (const pair of part.split(";")) {
      const trimmed = pair.trim();
      const eq = trimmed.indexOf("=");
      if (eq <= 0) {
        continue;
      }
      jar.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
    }
  }
  return [...jar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

function cookieHeader(response: Response) {
  const cookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : response.headers.get("set-cookie")
        ? [response.headers.get("set-cookie") as string]
        : [];

  return cookies
    .map((value) => value.split(";")[0]?.trim())
    .filter((value): value is string => Boolean(value))
    .join("; ");
}

function csrfFromHtml(html: string) {
  return html.match(/name="csrf-token"\s+content="([^"]+)"/)?.[1] ?? "";
}

let insecureAgent: Agent | undefined;

export function xuiTlsDispatcher() {
  if (!xuiTlsInsecure()) {
    return undefined;
  }

  insecureAgent ??= new Agent({ connect: { rejectUnauthorized: false } });
  return insecureAgent;
}

async function panelFetch(url: string, init: RequestInit) {
  const headers = new Headers(init.headers);
  const dispatcher = xuiTlsDispatcher();

  const response = await fetch(url, {
    ...init,
    headers,
    redirect: init.redirect ?? "manual",
    signal: init.signal ?? AbortSignal.timeout(10_000),
    ...(dispatcher ? { dispatcher } : {}),
  } as RequestInit);

  return response;
}

function panelLabel(node: XuiPanelTarget) {
  return node.id || node.host || "panel";
}

async function login(node: XuiPanelTarget): Promise<XuiSession> {
  const token = xuiApiToken();
  if (token) {
    return { baseUrl: panelBase(node), cookie: "", csrf: "", bearer: token };
  }

  const baseUrl = panelBase(node);
  const bootstrap = await panelFetch(`${baseUrl}/`, { method: "GET" });
  const csrf = csrfFromHtml(await bootstrap.text());
  let cookie = cookieHeader(bootstrap);

  const response = await panelFetch(`${baseUrl}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Cookie: cookie,
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    body: JSON.stringify({ username: node.username, password: node.password }),
  });

  cookie = mergeCookies(cookie, cookieHeader(response));
  const body = (await response.json().catch(() => null)) as XuiJson | null;

  if (!cookie && !body?.success) {
    throw new XuiError(body?.msg || `login_failed:${panelLabel(node)}`);
  }

  if (body?.success === false) {
    throw new XuiError(body.msg || `login_failed:${panelLabel(node)}`);
  }

  return { baseUrl, cookie, csrf, bearer: "" };
}

async function panelRequest(session: XuiSession, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (session.bearer) {
    headers.set("Authorization", `Bearer ${session.bearer}`);
  }
  if (session.cookie) {
    headers.set("Cookie", session.cookie);
  }
  if (session.csrf) {
    headers.set("X-CSRF-Token", session.csrf);
  }

  const response = await panelFetch(`${session.baseUrl}${path}`, { ...init, headers });
  const body = (await response.json().catch(() => null)) as XuiJson | null;

  if (!response.ok || body?.success === false) {
    throw new XuiError(
      body?.msg || `xui_request_failed:${path}:${response.status}:${body ? "json" : "empty"}`
    );
  }

  return body;
}

export function summarizeXuiInbounds(obj: unknown): XuiInboundSummary[] {
  const list = Array.isArray(obj) ? obj : [];
  return list.flatMap((item) => {
    if (!item || typeof item !== "object") {
      return [];
    }

    const row = item as {
      id?: number;
      protocol?: string;
      port?: number;
      remark?: string;
      enable?: boolean;
    };
    if (!row.id) {
      return [];
    }

    return [
      {
        id: row.id,
        protocol: String(row.protocol ?? ""),
        port: Number(row.port) || 0,
        remark: String(row.remark ?? ""),
        enable: row.enable !== false,
      },
    ];
  });
}

export async function probeXuiPanel(node: XuiPanelTarget) {
  try {
    const session = await login(node);
    const listed = await panelRequest(session, "/panel/api/inbounds/list");
    return { ok: true as const, inbounds: summarizeXuiInbounds(listed?.obj) };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.name === "TimeoutError" || error.name === "AbortError"
          ? "probe_timeout"
          : error.message
        : "probe_failed";
    return { ok: false as const, error: message };
  }
}

function inboundIdFrom(node: Node, obj: unknown, protocol = "vless") {
  if (node.inboundId && protocol === "vless") {
    return node.inboundId;
  }

  const list = Array.isArray(obj) ? obj : [];
  const inbound = list.find((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }
    const row = item as { enable?: boolean; protocol?: string };
    return row.enable !== false && String(row.protocol ?? "").toLowerCase().includes(protocol);
  }) as { id?: number } | undefined;

  const fallback = protocol === "vless" ? (list[0] as { id?: number } | undefined) : undefined;
  const id = inbound?.id ?? fallback?.id;
  if (!id) {
    throw new XuiError(`${protocol}_inbound_missing:${node.id}`);
  }

  return id;
}

function clientFields(input: XuiClientInput) {
  return {
    id: input.uuid,
    email: input.email,
    enable: true,
    expiryTime: input.expiresAt.getTime(),
    totalGB: input.trafficGb ? input.trafficGb * 1024 * 1024 * 1024 : 0,
    limitIp: 0,
    subId: input.email,
    flow: VLESS_CLIENT_FLOW,
  };
}

function clientSettings(input: XuiClientInput) {
  return JSON.stringify({ clients: [clientFields(input)] });
}

function isMissingRoute(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes(":404:") || message.includes("not found");
}

function isDuplicate(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return message.includes("duplicate") || message.includes("already") || message.includes("exist");
}

async function tryPanelRequests(
  session: XuiSession,
  attempts: { path: string; init: RequestInit }[]
) {
  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      await panelRequest(session, attempt.path, attempt.init);
      return;
    } catch (error) {
      if (isDuplicate(error)) {
        return;
      }
      lastError = error;
      if (!isMissingRoute(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new XuiError("xui_request_failed");
}

export async function addWireGuardPeer(
  node: Node,
  input: { email: string; publicKey: string; allowedIp: string }
) {
  const session = await login(node);
  const listed = await panelRequest(session, "/panel/api/inbounds/list");
  const inboundId = inboundIdFrom(node, listed?.obj, "wireguard");
  const jsonHeaders = { "Content-Type": "application/json" };
  const client = {
    id: input.publicKey,
    email: input.email,
    enable: true,
    publicKey: input.publicKey,
    allowedIPs: [input.allowedIp],
  };

  await tryPanelRequests(session, [
    {
      path: "/panel/api/inbounds/addClient",
      init: {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          id: inboundId,
          settings: JSON.stringify({ clients: [client] }),
        }),
      },
    },
    {
      path: "/panel/api/clients/add",
      init: {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          client,
          inboundIds: [inboundId],
        }),
      },
    },
  ]);

  return inboundId;
}

export async function addXuiClient(node: Node, input: XuiClientInput) {
  const session = await login(node);
  const listed = await panelRequest(session, "/panel/api/inbounds/list");
  const inboundId = inboundIdFrom(node, listed?.obj);
  const jsonHeaders = { "Content-Type": "application/json" };

  await tryPanelRequests(session, [
    {
      path: "/panel/api/clients/add",
      init: {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          client: clientFields(input),
          inboundIds: [inboundId],
        }),
      },
    },
    {
      path: "/panel/api/inbounds/addClient",
      init: {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          id: inboundId,
          settings: clientSettings(input),
        }),
      },
    },
  ]);

  return inboundId;
}

export async function updateXuiClientExpiry(node: Node, input: XuiClientInput) {
  const session = await login(node);
  const jsonHeaders = { "Content-Type": "application/json" };

  await tryPanelRequests(session, [
    {
      path: `/panel/api/clients/update/${encodeURIComponent(input.email)}`,
      init: {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify(clientFields(input)),
      },
    },
    {
      path: `/panel/api/inbounds/updateClient/${input.uuid}`,
      init: {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          id: node.inboundId ?? 1,
          settings: clientSettings(input),
        }),
      },
    },
  ]);
}

export async function deleteXuiClient(node: Node, input: { uuid: string; email: string }) {
  const session = await login(node);
  const listed = await panelRequest(session, "/panel/api/inbounds/list");
  const inboundId = inboundIdFrom(node, listed?.obj);

  await tryPanelRequests(session, [
    {
      path: `/panel/api/clients/del/${encodeURIComponent(input.email)}`,
      init: { method: "POST" },
    },
    {
      path: `/panel/api/inbounds/${inboundId}/delClient/${encodeURIComponent(input.uuid)}`,
      init: { method: "POST" },
    },
    {
      path: `/panel/api/inbounds/${inboundId}/delClient/${encodeURIComponent(input.email)}`,
      init: { method: "POST" },
    },
  ]);

  return inboundId;
}
