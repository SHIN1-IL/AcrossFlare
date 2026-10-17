/** Never a customer login. Staff and signup lists exclude this address. */
export const NODE_PROBE_USER_EMAIL = "node-probe@internal.acrossflare";

/** Paying-customer subscriptions. Admin node Karing checks set probeNodeId and stay out of this set. */
export const customerSubscriptionWhere = { probeNodeId: null } as const;

export function customerOnNodeWhere(nodeId: string) {
  return {
    ...customerSubscriptionWhere,
    nodes: { some: { id: nodeId } },
  };
}
