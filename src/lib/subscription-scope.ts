/** Never a customer login. Staff and signup lists exclude this address. */
export const NODE_PROBE_USER_EMAIL = "node-probe@internal.acrossflare";

/** Paying-customer subscriptions. Admin Karing checks set a probe id and stay out of this set. */
export const customerSubscriptionWhere = { probeNodeId: null, probeGroupId: null } as const;

/** Seeded demo rows. They stay visible as tests and do not take a customer seat. */
export function isDemoSubscription(id: string) {
  return id.startsWith("seed_");
}

export function customerOnNodeWhere(nodeId: string) {
  return {
    ...customerSubscriptionWhere,
    nodes: { some: { id: nodeId } },
  };
}
