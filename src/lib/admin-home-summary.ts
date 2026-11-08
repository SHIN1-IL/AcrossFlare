import { Product, type SubscriptionStatus } from "@prisma/client";
import type { AdminCustomer, AdminPoolCapacity, BootstrapQuota } from "@/lib/admin";
import { toCustomerStatus } from "@/lib/admin-data";
import type { AdminPermission } from "@/lib/admin-permissions";
import { poolsForAdminService } from "@/lib/admin-overview";
import { adminQueueCounts } from "@/lib/admin-queue";
import { ADMIN_SERVICES, adminServiceFromPlanId, catalogPlanIds, type AdminServiceId } from "@/lib/admin-service";
import { prisma } from "@/lib/db";
import { DAILY_BOOTSTRAP_LIMIT } from "@/lib/provision/capacity-expand";
import { NODE_PROBE_USER_EMAIL, customerSubscriptionWhere } from "@/lib/subscription-scope";

export type AdminHomeQueue = {
  failed: number;
  provisioning: number;
  unpaid: number;
  expiring: number;
};

export type AdminHomeServiceSummary = {
  customerCount: number;
  planCount: number;
  nodeCount: number;
  seatsRemaining: number;
  queue: AdminHomeQueue;
};

export type AdminHomeSummary = {
  services: Record<AdminServiceId, AdminHomeServiceSummary>;
  capacityPools: AdminPoolCapacity[];
  bootstrapQuota: BootstrapQuota;
};

type SummarySubscription = {
  status: AdminCustomer["status"];
  expiresAt: string;
  planId: string;
};

const EMPTY_QUEUE: AdminHomeQueue = {
  failed: 0,
  provisioning: 0,
  unpaid: 0,
  expiring: 0,
};

function queueCustomer(row: SummarySubscription): AdminCustomer {
  return {
    id: "",
    product: "global",
    email: "",
    planId: row.planId,
    planName: "",
    expiresAt: row.expiresAt,
    memo: "",
    status: row.status,
    nodeIds: [],
    failover: false,
    createdAt: "",
    signedUpAt: "",
    signupOnly: false,
    credentials: null,
    rotateHistory: [],
    planChange: null,
    provisionStep: "ready",
    provisionError: "",
    payments: [],
    auditLogs: [],
  };
}

function queueSlice(counts: ReturnType<typeof adminQueueCounts>): AdminHomeQueue {
  return {
    failed: counts.failed,
    provisioning: counts.provisioning,
    unpaid: counts.unpaid,
    expiring: counts.expiring,
  };
}

/** Same service split and queue rules as the customer table, without the full row payload. */
export function buildAdminHomeSummary(input: {
  subscriptions: SummarySubscription[];
  signupOnlyCount: number;
  planIds: readonly string[];
  globalNodeCount: number;
  workspaceNodeCount: number;
  capacityPools: AdminPoolCapacity[];
  bootstrapQuota: BootstrapQuota;
  now?: number;
}): AdminHomeSummary {
  const planIds = new Set(input.planIds);
  const pools = input.capacityPools.map((pool) => ({ ...pool, groups: [] }));
  const services = {} as Record<AdminServiceId, AdminHomeServiceSummary>;

  for (const service of ADMIN_SERVICES) {
    const rows = input.subscriptions.filter((row) => adminServiceFromPlanId(row.planId) === service);
    const counts = adminQueueCounts(rows.map(queueCustomer), input.now);
    const seatsRemaining = poolsForAdminService(service, pools).reduce(
      (sum, pool) => sum + pool.seatsRemaining,
      0
    );
    services[service] = {
      customerCount: rows.length + (service === "standard" ? input.signupOnlyCount : 0),
      planCount: catalogPlanIds(service).filter((id) => planIds.has(id)).length,
      nodeCount: service === "workspace" ? input.workspaceNodeCount : input.globalNodeCount,
      seatsRemaining,
      queue: queueSlice(counts),
    };
  }

  return {
    services,
    capacityPools: pools,
    bootstrapQuota: input.bootstrapQuota,
  };
}

export function presentAdminHomeSummary(
  summary: AdminHomeSummary,
  permissions: readonly AdminPermission[]
): AdminHomeSummary {
  const customers = permissions.includes("customers");
  const plans = permissions.includes("plans");
  const nodes = permissions.includes("nodes");
  const capacity = customers || nodes;
  const services = {} as Record<AdminServiceId, AdminHomeServiceSummary>;

  for (const service of ADMIN_SERVICES) {
    const row = summary.services[service];
    services[service] = {
      customerCount: customers ? row.customerCount : 0,
      planCount: plans ? row.planCount : 0,
      nodeCount: nodes ? row.nodeCount : 0,
      seatsRemaining: capacity ? row.seatsRemaining : 0,
      queue: customers ? row.queue : EMPTY_QUEUE,
    };
  }

  return {
    services,
    capacityPools: capacity ? summary.capacityPools : [],
    bootstrapQuota: capacity
      ? summary.bootstrapQuota
      : { ...summary.bootstrapQuota, used: 0, recentFailures: 0 },
  };
}

export async function loadAdminHomeSummary(): Promise<AdminHomeSummary> {
  const { listPoolCapacity } = await import("@/lib/provision/capacity");
  const [subscriptions, plans, nodes, signupOnlyCount, capacity] = await Promise.all([
    prisma.subscription.findMany({
      where: customerSubscriptionWhere,
      select: { status: true, expiresAt: true, planId: true },
    }),
    prisma.plan.findMany({ select: { id: true } }),
    prisma.node.findMany({ select: { product: true } }),
    prisma.user.count({
      where: {
        role: "USER",
        email: { not: NODE_PROBE_USER_EMAIL },
        subscriptions: { none: {} },
      },
    }),
    listPoolCapacity().catch(() => null),
  ]);

  return buildAdminHomeSummary({
    subscriptions: subscriptions.map((row) => ({
      status: toCustomerStatus(row.status as SubscriptionStatus),
      expiresAt: row.expiresAt.toISOString(),
      planId: row.planId,
    })),
    signupOnlyCount,
    planIds: plans.map((plan) => plan.id),
    globalNodeCount: nodes.filter((node) => node.product === Product.GLOBAL).length,
    workspaceNodeCount: nodes.filter((node) => node.product === Product.WORKSPACE).length,
    capacityPools: capacity?.pools ?? [],
    bootstrapQuota: capacity?.bootstrap ?? {
      used: 0,
      limit: DAILY_BOOTSTRAP_LIMIT,
      recentFailures: 0,
    },
  });
}
