/** How many bootstrap jobs may start in one UTC day. */
export const DAILY_BOOTSTRAP_LIMIT = 20;

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
 * A READY group that still has seats keeps the node (no extra seats).
 * When every READY group is full, join an OPENING group or start one.
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

  const readyWithRoom = input.groups
    .filter((group) => group.status === "READY" && group.seatsUsed < group.seatsMax)
    .sort(byCreated);
  if (readyWithRoom[0]) {
    return { groupId: readyWithRoom[0].id, status: "READY" };
  }

  const opening = input.groups.filter((group) => group.status === "OPENING").sort(byCreated);
  if (opening[0]) {
    const nextPrimary = opening[0].primaryOnline + (input.incomingRole === "PRIMARY" ? 1 : 0);
    return {
      groupId: opening[0].id,
      status: nextPrimary >= required ? "READY" : "OPENING",
    };
  }

  const opensNow = input.incomingRole === "PRIMARY" && required <= 1;
  return { groupId: null, status: opensNow ? "READY" : "OPENING" };
}
