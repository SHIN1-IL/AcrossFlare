import {
  BootstrapJobStatus,
  InstanceGroupStatus,
  NodeHealth,
  NodeRole,
  Product,
  type Node,
  type Plan,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { customerSubscriptionWhere } from "@/lib/subscription-scope";
import {
  DAILY_BOOTSTRAP_LIMIT,
  HYBRID_POOL_ID,
  attachedSeatCount,
  bootstrapFailureSince,
  groupSeatView,
  neededSlotsForPool,
  occupiedSeats,
  parseHybridSeats,
  parseHybridSelectable,
  planHybridSeatUpdate,
  selectableBundle,
  utcDayStart,
} from "@/lib/provision/capacity-expand";
import { ProvisionError } from "@/lib/provision/errors";
import { nodeNameMatchesCode } from "@/lib/provision/node-match";
import { nodeWiring } from "@/lib/provision/node-wiring";

export const POOL_GLOBAL_STANDARD = "global-standard";
export const POOL_GLOBAL_HYBRID = "global-hybrid";
export const POOL_MARKETING_DEFAULT = "marketing-default";

/** Map legacy plan.nodeCodes → pool id (used by seed / plan save). */
export function poolIdForNodeCodes(product: Product, nodeCodes: string[]): string | null {
  if (product === Product.WORKSPACE) {
    return null;
  }
  if (product === Product.MARKETING) {
    return POOL_MARKETING_DEFAULT;
  }

  const normalized = nodeCodes.map((code) => code.trim()).filter(Boolean);
  if (normalized.length === 1 && normalized.some((code) => /la\s*\(?\s*b\s*\)?/i.test(code) || code === "LA(B)")) {
    return POOL_GLOBAL_STANDARD;
  }
  if (
    normalized.some((code) => /tokyo/i.test(code)) &&
    normalized.some((code) => /la\s*\(?\s*a\s*\)?/i.test(code) || code === "LA(A)")
  ) {
    return POOL_GLOBAL_HYBRID;
  }
  if (normalized.length <= 1) {
    return POOL_GLOBAL_STANDARD;
  }
  return POOL_GLOBAL_HYBRID;
}

export type AssignNodesResult = {
  nodes: Node[];
  instanceGroupId: string | null;
};

/**
 * Pick nodes for a plan. Prefers capacity pool + seat reservation when poolId is set.
 * Legacy nodeCodes matching remains when pool is missing; never falls back to arbitrary nodes.
 */
export async function assignNodesForPlan(
  product: Product,
  plan: Plan,
  options?: {
    subscriptionId?: string;
    /** When changing plans, release the previous group seat first. */
    previousGroupId?: string | null;
  }
): Promise<AssignNodesResult> {
  if (product === Product.WORKSPACE) {
    return { nodes: [], instanceGroupId: null };
  }

  if (options?.subscriptionId) {
    const existing = await prisma.subscription.findUnique({
      where: { id: options.subscriptionId },
      select: {
        instanceGroupId: true,
        instanceGroup: {
          include: {
            nodes: {
              orderBy: { sortOrder: "asc" },
              include: { node: true },
            },
            pool: true,
          },
        },
      },
    });

    if (existing?.instanceGroupId && existing.instanceGroup && plan.poolId === existing.instanceGroup.poolId) {
      const required = Math.max(1, existing.instanceGroup.pool.maxSelectable);
      const nodes = selectableBundle(
        existing.instanceGroup.nodes.map((row) => row.node),
        existing.instanceGroup.pool.maxSelectable
      );
      if (nodes.length >= required) {
        return { nodes, instanceGroupId: existing.instanceGroupId };
      }
      await releaseSeat(existing.instanceGroupId, options.subscriptionId);
    }
  }

  if (options?.previousGroupId && options.subscriptionId) {
    await releaseSeat(options.previousGroupId, options.subscriptionId);
  }

  if (plan.poolId) {
    return reserveSeatAndLoadNodes(plan.poolId, options?.subscriptionId);
  }

  const nodes = await matchNodesByCodes(product, plan.nodeCodes);
  if (!nodes.length) {
    throw new ProvisionError("node_missing");
  }
  return { nodes, instanceGroupId: null };
}

export async function releaseSeat(groupId: string | null | undefined, subscriptionId?: string) {
  if (!groupId) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (subscriptionId) {
      const current = await tx.subscription.findUnique({
        where: { id: subscriptionId },
        select: { instanceGroupId: true },
      });
      if (current?.instanceGroupId !== groupId) {
        return;
      }
      await tx.subscription.update({
        where: { id: subscriptionId },
        data: { instanceGroupId: null },
      });
    }

    await tx.$executeRaw`
      UPDATE "InstanceGroup"
      SET "seatsUsed" = GREATEST("seatsUsed" - 1, 0),
          "updatedAt" = NOW()
      WHERE id = ${groupId}
    `;
  });
}

function completeCustomerBundle(nodes: Node[], maxSelectable: number) {
  const required = Math.max(1, maxSelectable);
  const bundle = selectableBundle(nodes, maxSelectable);
  return bundle.length >= required ? bundle : [];
}

async function reserveSeatAndLoadNodes(
  poolId: string,
  subscriptionId?: string
): Promise<AssignNodesResult> {
  const candidates = await prisma.instanceGroup.findMany({
    where: { poolId, status: InstanceGroupStatus.READY },
    orderBy: { createdAt: "asc" },
    include: {
      pool: true,
      nodes: {
        orderBy: { sortOrder: "asc" },
        include: { node: true },
      },
    },
  });

  for (const candidate of candidates) {
    if (candidate.seatsUsed >= candidate.seatsMax) {
      continue;
    }
    const preview = completeCustomerBundle(
      candidate.nodes.map((row) => row.node),
      candidate.pool.maxSelectable
    );
    if (!preview.length) {
      continue;
    }

    const reserved = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        UPDATE "InstanceGroup" AS g
        SET "seatsUsed" = g."seatsUsed" + 1,
            "updatedAt" = NOW()
        WHERE g.id = ${candidate.id}
          AND g.status = 'READY'::"InstanceGroupStatus"
          AND g."seatsUsed" < g."seatsMax"
        RETURNING g.id
      `;

      const groupId = rows[0]?.id;
      if (!groupId) {
        return null;
      }

      if (subscriptionId) {
        await tx.subscription.update({
          where: { id: subscriptionId },
          data: { instanceGroupId: groupId },
        });
      }

      return groupId;
    });

    if (!reserved) {
      continue;
    }

    return { nodes: preview, instanceGroupId: reserved };
  }

  throw new ProvisionError("capacity_full");
}

async function matchNodesByCodes(product: Product, nodeCodes: string[]) {
  if (!nodeCodes.length) {
    return [] as Node[];
  }

  const pool = await prisma.node.findMany({
    where: {
      product,
      status: { not: NodeHealth.OFFLINE },
    },
    orderBy: { createdAt: "asc" },
  });

  const matched = nodeCodes
    .map((code) => pool.find((node) => nodeNameMatchesCode(node.name, code) && nodeWiring(node) !== "placeholder"))
    .filter((node): node is Node => Boolean(node));

  const unique: Node[] = [];
  const seen = new Set<string>();
  for (const node of matched) {
    if (seen.has(node.id)) {
      continue;
    }
    seen.add(node.id);
    unique.push(node);
  }
  return unique;
}

export async function poolHasOpenSeat(poolId: string) {
  const groups = await prisma.instanceGroup.findMany({
    where: { poolId, status: InstanceGroupStatus.READY },
    include: {
      pool: { select: { maxSelectable: true } },
      nodes: {
        orderBy: { sortOrder: "asc" },
        include: { node: true },
      },
    },
  });
  return groups.some(
    (group) =>
      group.seatsUsed < group.seatsMax &&
      completeCustomerBundle(
        group.nodes.map((row) => row.node),
        group.pool.maxSelectable
      ).length > 0
  );
}

export async function listPoolCapacity() {
  const [pools, failedJobs, usedToday] = await Promise.all([
    prisma.capacityPool.findMany({
      include: {
        groups: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            status: true,
            seatsUsed: true,
            seatsMax: true,
            nodes: {
              orderBy: { sortOrder: "asc" },
              select: {
                node: {
                  select: {
                    id: true,
                    name: true,
                    ddns: true,
                    role: true,
                    status: true,
                    host: true,
                    password: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { id: "asc" },
    }),
    prisma.nodeBootstrapJob.findMany({
      where: {
        status: BootstrapJobStatus.FAILED,
        createdAt: { gte: bootstrapFailureSince() },
      },
      select: { poolId: true },
    }),
    prisma.nodeBootstrapJob.count({
      where: { createdAt: { gte: utcDayStart() } },
    }),
  ]);

  const failuresByPool = new Map<string, number>();
  for (const job of failedJobs) {
    if (!job.poolId) {
      continue;
    }
    failuresByPool.set(job.poolId, (failuresByPool.get(job.poolId) ?? 0) + 1);
  }

  const nodeIds = [
    ...new Set(pools.flatMap((pool) => pool.groups.flatMap((group) => group.nodes.map((row) => row.node.id)))),
  ];
  const linked = nodeIds.length
    ? await prisma.subscription.findMany({
        where: { ...customerSubscriptionWhere, nodes: { some: { id: { in: nodeIds } } } },
        select: { instanceGroupId: true, nodes: { select: { id: true } } },
      })
    : [];
  const attachments = linked.map((subscription) => ({
    instanceGroupId: subscription.instanceGroupId,
    nodeIds: subscription.nodes.map((node) => node.id),
  }));

  return {
    pools: pools.map((pool) => {
      const seatView = (group: (typeof pool.groups)[number]) =>
        groupSeatView({
          seatsUsed: group.seatsUsed,
          seatsMax: group.seatsMax,
          attached: attachedSeatCount(
            { id: group.id, nodeIds: group.nodes.map((row) => row.node.id) },
            attachments
          ),
        });
      const ready = pool.groups.filter((group) => group.status === InstanceGroupStatus.READY);
      const readyViews = ready.map(seatView);
      const seatsUsed = readyViews.reduce((sum, view) => sum + view.used, 0);
      const seatsMax = readyViews.reduce((sum, view) => sum + view.max, 0);
      const seatsRemaining = readyViews.reduce((sum, view) => sum + view.remaining, 0);
      const team =
        pool.groups.find((group) => group.status === InstanceGroupStatus.READY) ??
        pool.groups.find((group) => group.status === InstanceGroupStatus.OPENING);
      const opening = pool.groups.find((group) => group.status === InstanceGroupStatus.OPENING);
      const openingPrimaryOnline = opening
        ? opening.nodes.filter(
            (row) =>
              row.node.role === NodeRole.PRIMARY &&
              row.node.status !== NodeHealth.OFFLINE &&
              nodeWiring(row.node) !== "placeholder"
          ).length
        : null;

      return {
        id: pool.id,
        product: pool.product,
        name: pool.name,
        maxSelectable: pool.maxSelectable,
        teamSeatsMax: team?.seatsMax ?? pool.seatsMaxDefault,
        seatsUsed,
        seatsMax,
        seatsRemaining,
        full: seatsRemaining === 0,
        neededSlots: neededSlotsForPool({
          maxSelectable: pool.maxSelectable,
          seatsRemaining,
          openingPrimaryOnline,
        }),
        recentBootstrapFailures: failuresByPool.get(pool.id) ?? 0,
        groups: pool.groups.map((group) => {
          const view = seatView(group);
          const bundle = selectableBundle(
            group.nodes.map((row) => row.node),
            pool.maxSelectable
          );
          return {
            id: group.id,
            name: group.name,
            status: group.status,
            seatsUsed: view.used,
            seatsMax: view.max,
            nodes: bundle.map((node) => ({
              id: node.id,
              name: node.name,
              ddns: node.ddns,
              role: node.role === NodeRole.FAILOVER ? ("failover" as const) : ("primary" as const),
            })),
          };
        }),
      };
    }),
    bootstrap: {
      used: usedToday,
      limit: DAILY_BOOTSTRAP_LIMIT,
      recentFailures: failedJobs.length,
    },
  };
}

export async function updateHybridTeamLimits(input: { maxSelectable: unknown; seatsMax: unknown }) {
  const maxSelectable = parseHybridSelectable(input.maxSelectable);
  const seatsMax = parseHybridSeats(input.seatsMax);
  if (maxSelectable == null || seatsMax == null) {
    throw new ProvisionError("invalid_limits");
  }

  const pool = await prisma.capacityPool.findUnique({
    where: { id: HYBRID_POOL_ID },
    include: {
      groups: {
        select: {
          id: true,
          status: true,
          seatsUsed: true,
          nodes: { select: { nodeId: true } },
        },
      },
    },
  });
  if (!pool) {
    throw new ProvisionError("pool_missing");
  }

  const nodeIds = pool.groups.flatMap((group) => group.nodes.map((row) => row.nodeId));
  const linked = nodeIds.length
    ? await prisma.subscription.findMany({
        where: { ...customerSubscriptionWhere, nodes: { some: { id: { in: nodeIds } } } },
        select: { instanceGroupId: true, nodes: { select: { id: true } } },
      })
    : [];
  const attachments = linked.map((subscription) => ({
    instanceGroupId: subscription.instanceGroupId,
    nodeIds: subscription.nodes.map((node) => node.id),
  }));
  const measured = pool.groups.map((group) => ({
    id: group.id,
    status: group.status,
    seatsUsed: occupiedSeats(
      group.seatsUsed,
      attachedSeatCount(
        { id: group.id, nodeIds: group.nodes.map((row) => row.nodeId) },
        attachments
      )
    ),
  }));
  const plan = planHybridSeatUpdate(measured, seatsMax);
  if (!plan.ok) {
    throw new ProvisionError(plan.error);
  }

  await prisma.$transaction([
    prisma.capacityPool.update({
      where: { id: HYBRID_POOL_ID },
      data: { maxSelectable, seatsMaxDefault: seatsMax },
    }),
    ...(plan.groupIds.length
      ? [
          prisma.instanceGroup.updateMany({
            where: { id: { in: plan.groupIds } },
            data: { seatsMax },
          }),
        ]
      : []),
  ]);

  return { maxSelectable, seatsMax };
}
