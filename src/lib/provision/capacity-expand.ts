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
