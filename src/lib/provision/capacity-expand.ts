import { nodeWiring } from "@/lib/provision/node-wiring";

/** How many bootstrap jobs may start in one UTC day. */
export const DAILY_BOOTSTRAP_LIMIT = 20;

export const HYBRID_POOL_ID = "global-hybrid";
/** Hybrid customers receive this many primary nodes unless an admin raises it. */
export const HYBRID_SELECTABLE_MIN = 2;
export const HYBRID_SELECTABLE_MAX = 9;
/** People who can share one hybrid node team. */
export const HYBRID_SEATS_MIN = 1;
export const HYBRID_SEATS_MAX = 10;

export function parseHybridSelectable(value: unknown) {
  const count = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(count) || count < HYBRID_SELECTABLE_MIN || count > HYBRID_SELECTABLE_MAX) {
    return null;
  }
  return count;
}

export function parseHybridSeats(value: unknown) {
  const count = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(count) || count < HYBRID_SEATS_MIN || count > HYBRID_SEATS_MAX) {
    return null;
  }
  return count;
}

/** Ready and opening groups share one team size. A cap below people already assigned is refused. */
export function planHybridSeatUpdate(
  groups: ReadonlyArray<{ id: string; status: string; seatsUsed: number }>,
  seatsMax: number
): { ok: true; groupIds: string[] } | { ok: false; error: "seats_below_used" } {
  const targets = groups.filter((group) => group.status === "READY" || group.status === "OPENING");
  if (targets.some((group) => group.seatsUsed > seatsMax)) {
    return { ok: false, error: "seats_below_used" };
  }
  return { ok: true, groupIds: targets.map((group) => group.id) };
}

/** Failed bootstrap jobs in this window raise an admin alert. No automatic VPS purchase. */
export const BOOTSTRAP_FAILURE_ALERT_COUNT = 3;
export const BOOTSTRAP_FAILURE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type CapacitySlotNeed = {
  role: "primary" | "failover";
  count: number;
};

export type BootstrapGroupChoice = {
  id: string;
  status: "READY" | "OPENING" | "DRAINING";
  seatsUsed: number;
  seatsMax: number;
  primaryOnline: number;
  createdAt: Date;
};

export type BootstrapTarget = {
  /** Null means create a new group. */
  groupId: string | null;
  status: "READY" | "OPENING";
};

function excludedFromBundle(node: { host?: string; password?: string | null }) {
  if (typeof node.host !== "string") {
    return false;
  }
  return nodeWiring({ host: node.host, password: node.password }) === "placeholder";
}

/** Online nodes a customer actually receives from one group, in group order. */
export function selectableBundle<
  T extends { role: string; status: string; host?: string; password?: string | null },
>(nodes: readonly T[], maxSelectable: number) {
  const online = nodes.filter((node) => node.status !== "OFFLINE" && !excludedFromBundle(node));
  const primary = online.filter((node) => node.role === "PRIMARY");
  const ordered = primary.length ? primary : online;
  return ordered.slice(0, Math.max(1, maxSelectable));
}

/** Display occupancy. Checkout still reserves with the stored seatsUsed counter. */
export function occupiedSeats(seatsUsed: number, attached: number) {
  return Math.max(0, seatsUsed, attached);
}

export function groupSeatView(input: { seatsUsed: number; seatsMax: number; attached: number }) {
  const used = occupiedSeats(input.seatsUsed, input.attached);
  const max = Math.max(0, input.seatsMax);
  const remaining = Math.max(0, max - used);
  return { used, max, remaining, full: remaining === 0 };
}

/**
 * One subscription is one seat even when it is attached to every node in the group.
 * A stored instance group wins over a node overlap, so the same row is not counted twice.
 */
export function attachedSeatCount(
  group: { id: string; nodeIds: readonly string[] },
  subscriptions: ReadonlyArray<{ instanceGroupId: string | null; nodeIds: readonly string[] }>
) {
  const nodes = new Set(group.nodeIds);
  let count = 0;
  for (const subscription of subscriptions) {
    if (subscription.instanceGroupId) {
      if (subscription.instanceGroupId === group.id) {
        count += 1;
      }
      continue;
    }
    if (subscription.nodeIds.some((id) => nodes.has(id))) {
      count += 1;
    }
  }
  return count;
}

export function utcDayStart(now = new Date()) {
  const since = new Date(now);
  since.setUTCHours(0, 0, 0, 0);
  return since;
}

export function bootstrapFailureSince(now = new Date()) {
  return new Date(now.getTime() - BOOTSTRAP_FAILURE_WINDOW_MS);
}

/**
 * Slots still required before a full pool can take another customer.
 * An OPENING group counts the PRIMARY nodes it already has.
 */
export function neededSlotsForPool(input: {
  maxSelectable: number;
  seatsRemaining: number;
  openingPrimaryOnline: number | null;
}): CapacitySlotNeed[] {
  if (input.seatsRemaining > 0) {
    return [];
  }

  const required = Math.max(1, input.maxSelectable);
  const have = input.openingPrimaryOnline ?? 0;
  const missing = Math.max(0, required - have);
  if (!missing) {
    return [];
  }

  return [{ role: "primary", count: missing }];
}

/**
 * Where a new bootstrapped node should land.
 * A group takes another PRIMARY only until its online primary count reaches maxSelectable.
 * The next PRIMARY opens the following group. Free customer seats do not pull extra nodes into a full bundle.
 * Seats open only after the group has enough online PRIMARY nodes.
 */
export function chooseBootstrapTarget(input: {
  groups: BootstrapGroupChoice[];
  maxSelectable: number;
  incomingRole: "PRIMARY" | "FAILOVER";
}): BootstrapTarget {
  const required = Math.max(1, input.maxSelectable);
  const byCreated = (left: BootstrapGroupChoice, right: BootstrapGroupChoice) =>
    left.createdAt.getTime() - right.createdAt.getTime();

  const filling = input.groups
    .filter((group) => group.status !== "DRAINING" && group.primaryOnline < required)
    .sort(byCreated);

  if (input.incomingRole === "PRIMARY" && filling[0]) {
    const nextPrimary = filling[0].primaryOnline + 1;
    return {
      groupId: filling[0].id,
      status: nextPrimary >= required ? "READY" : "OPENING",
    };
  }

  if (input.incomingRole === "FAILOVER" && filling[0]) {
    return {
      groupId: filling[0].id,
      status: filling[0].status === "READY" ? "READY" : "OPENING",
    };
  }

  if (input.incomingRole === "FAILOVER") {
    return { groupId: null, status: "OPENING" };
  }

  return { groupId: null, status: required <= 1 ? "READY" : "OPENING" };
}
