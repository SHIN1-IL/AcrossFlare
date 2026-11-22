import type { ChinaReachability as DbChinaReachability } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  customerConnectTarget,
  shouldNotifyChinaBlock,
  type ChinaReachability,
} from "@/lib/china-reachability/classify";
import { checkPingPeTcp, chinaProbeUrl } from "@/lib/china-reachability/pingpe";
import { notifyOpsChinaBlock } from "@/lib/ops-notify";

const DB_STATUS: Record<ChinaReachability, DbChinaReachability> = {
  unknown: "UNKNOWN",
  open: "OPEN",
  blocked: "BLOCKED",
  down: "DOWN",
  partial: "PARTIAL",
};

const UI_STATUS: Record<DbChinaReachability, ChinaReachability> = {
  UNKNOWN: "unknown",
  OPEN: "open",
  BLOCKED: "blocked",
  DOWN: "down",
  PARTIAL: "partial",
};

let current: Promise<{ checked: number; blocked: string[] }> | null = null;

export function isChinaCheckRunning() {
  return current !== null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runChinaReachability(nodeId?: string) {
  const nodes = await prisma.node.findMany({
    where: nodeId ? { id: nodeId } : undefined,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      ddns: true,
      host: true,
      vlessPort: true,
      entryHost: true,
      entryPort: true,
      chinaReachability: true,
    },
  });

  const blocked: string[] = [];
  let checked = 0;
  for (const [index, node] of nodes.entries()) {
    if (index > 0) {
      await sleep(2000);
    }
    const target = customerConnectTarget(node);
    if (!target) {
      continue;
    }
    let next: ChinaReachability = "unknown";
    try {
      next = await checkPingPeTcp(target.host, target.port);
    } catch (error) {
      console.error("china_reachability_failed", node.id, error);
    }
    if (next === "unknown") {
      console.info("china_reachability_unknown", node.id);
      continue;
    }
    checked += 1;
    const previous = UI_STATUS[node.chinaReachability];
    await prisma.node.update({
      where: { id: node.id },
      data: { chinaReachability: DB_STATUS[next], chinaCheckedAt: new Date() },
    });
    console.info("china_reachability", node.id, previous, next);
    if (shouldNotifyChinaBlock(previous, next)) {
      blocked.push(node.name);
      await notifyOpsChinaBlock({
        name: node.name,
        ddns: node.ddns,
        probeUrl: chinaProbeUrl(target.host, target.port),
      });
    }
  }
  return { checked, blocked };
}

export function startChinaReachability(nodeId?: string) {
  if (current) {
    return current;
  }
  current = runChinaReachability(nodeId).finally(() => {
    current = null;
  });
  return current;
}
