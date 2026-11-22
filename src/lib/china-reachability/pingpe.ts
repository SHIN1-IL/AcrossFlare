import { classifyChinaReachability, tcpProbeSucceeded, type ChinaReachability } from "@/lib/china-reachability/classify";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export type PingPeNode = {
  id: string;
  location: string;
  china: boolean;
};

export type PingPeTaskPage = {
  query: string;
  token: string;
  cookie: string;
  nodes: PingPeNode[];
};

export function chinaProbeUrl(host: string, port: number) {
  return `https://tcp.ping.pe/${host}:${port}`;
}

export function parsePingPeTaskPage(html: string, cookieHeader = ""): PingPeTaskPage | null {
  const token = html.match(/var taskStartToken = "([^"]+)"/);
  const query = html.match(/var taskStartQuery = "([^"]+)"/);
  const cookie = html.match(/antiflood=([a-f0-9]+)/i);
  const resolvedCookie = cookieHeader || (cookie ? `antiflood=${cookie[1]}` : "");
  if (!token || !query || !resolvedCookie) {
    return null;
  }

  const nodes: PingPeNode[] = [];
  const row = /data-pinger-id='([^']+)' data-location='([^']+)'/g;
  for (const match of html.matchAll(row)) {
    nodes.push({
      id: match[1],
      location: match[2],
      china: match[2] === "China" || match[2].startsWith("China,"),
    });
  }
  if (!nodes.some((node) => node.china)) {
    return null;
  }

  return {
    query: query[1],
    token: token[1],
    cookie: resolvedCookie,
    nodes,
  };
}

export function parsePingPeResults(body: string): {
  outstanding: number;
  samples: Array<{ nodeId: string; ok: boolean | null }>;
} {
  let parsed: unknown = body;
  for (let attempt = 0; attempt < 2 && typeof parsed === "string"; attempt += 1) {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return { outstanding: 0, samples: [] };
    }
  }
  if (!parsed || typeof parsed !== "object") {
    return { outstanding: 0, samples: [] };
  }
  const record = parsed as { state?: { outstandingNodeCount?: unknown }; data?: unknown };
  const outstanding = Number(record.state?.outstandingNodeCount ?? 0);
  const rows = Array.isArray(record.data) ? record.data : [];
  const samples = rows.flatMap((row) => {
    if (!row || typeof row !== "object") {
      return [];
    }
    const item = row as { node_id?: unknown; result?: unknown };
    if (typeof item.node_id !== "string" || typeof item.result !== "number") {
      return [];
    }
    return [{ nodeId: item.node_id, ok: tcpProbeSucceeded(item.result) }];
  });
  return { outstanding: Number.isFinite(outstanding) ? outstanding : 0, samples };
}

export function reachabilityFromSamples(
  nodes: PingPeNode[],
  samples: Array<{ nodeId: string; ok: boolean | null }>
): ChinaReachability {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const china: Array<boolean | null> = [];
  const overseas: Array<boolean | null> = [];
  for (const sample of samples) {
    const node = byId.get(sample.nodeId);
    if (!node || sample.ok === null) {
      continue;
    }
    if (node.china) {
      china.push(sample.ok);
    } else {
      overseas.push(sample.ok);
    }
  }
  return classifyChinaReachability({
    china,
    overseas,
    chinaListed: nodes.filter((node) => node.china).length,
  });
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

async function loadTaskPage(host: string, port: number, fetchImpl: FetchLike) {
  const bare = chinaProbeUrl(host, port);
  const headers = { "User-Agent": USER_AGENT, Accept: "text/html" };
  const intro = await fetchImpl(bare, { headers, redirect: "manual" });
  const introHtml = await intro.text();
  const cookieMatch = introHtml.match(/antiflood=([a-f0-9]+)/i);
  const cookie = cookieMatch ? `antiflood=${cookieMatch[1]}` : "";
  if (introHtml.includes("taskStartToken")) {
    const page = parsePingPeTaskPage(introHtml, cookie);
    return page ? { page, pageUrl: bare } : null;
  }
  const pageUrl = `${bare}?browsercheck=ok`;
  const second = await fetchImpl(pageUrl, {
    headers: cookie ? { ...headers, Cookie: cookie } : headers,
    redirect: "follow",
  });
  const page = parsePingPeTaskPage(await second.text(), cookie);
  return page ? { page, pageUrl } : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function checkPingPeTcp(
  host: string,
  port: number,
  fetchImpl: FetchLike = fetch
): Promise<ChinaReachability> {
  const loaded = await loadTaskPage(host, port, fetchImpl);
  if (!loaded) {
    return "unknown";
  }
  const { page, pageUrl } = loaded;
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/json, text/plain, */*",
    Cookie: page.cookie,
    Origin: "https://tcp.ping.pe",
    Referer: pageUrl,
  };
  const started = await fetchImpl("https://tcp.ping.pe/ajax_startTask_v1.php", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ query: page.query, start_token: page.token }).toString(),
  });
  const startBody = (await started.json().catch(() => null)) as { ok?: boolean; data?: { stream_id?: string } } | null;
  const streamId = startBody?.ok ? startBody.data?.stream_id : "";
  if (!streamId) {
    return "unknown";
  }

  const seen = new Map<string, boolean | null>();
  try {
    for (let poll = 0; poll < 20; poll += 1) {
      if (poll > 0) {
        await sleep(3000);
      }
      const result = await fetchImpl(
        `https://tcp.ping.pe/ajax_getPingResults_v2.php?type=tcp&totalPolls=${poll}&stream_id=${encodeURIComponent(streamId)}`,
        { headers }
      );
      const parsed = parsePingPeResults(await result.text());
      for (const sample of parsed.samples) {
        if (sample.ok !== null) {
          seen.set(sample.nodeId, sample.ok);
        }
      }
      const china = page.nodes.filter((node) => node.china);
      const chinaComplete = china.length > 0 && china.every((node) => seen.has(node.id));
      const overseasSeen = page.nodes.some((node) => !node.china && seen.has(node.id));
      if ((parsed.outstanding === 0 && seen.size > 0) || (chinaComplete && overseasSeen)) {
        return reachabilityFromSamples(
          page.nodes,
          [...seen].map(([nodeId, ok]) => ({ nodeId, ok }))
        );
      }
    }
  } finally {
    await fetchImpl(`https://tcp.ping.pe/ajax_stopTask.php?stream_id=${encodeURIComponent(streamId)}`, {
      headers,
    }).catch(() => undefined);
  }
  return "unknown";
}
