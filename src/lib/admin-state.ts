import type { AdminCustomer } from "@/lib/admin";
import { ADMIN_SERVICES, adminServiceFromPlanId, type AdminServiceId } from "@/lib/admin-service";

export const ADMIN_STATE_PARTS = ["plans", "nodes", "customers", "promoCodes", "capacity", "bootstrapJobs"] as const;

export type AdminStatePart = (typeof ADMIN_STATE_PARTS)[number];

export const ADMIN_STATE_FRESH_MS = 30_000;

export function isAdminStatePart(value: string): value is AdminStatePart {
  return (ADMIN_STATE_PARTS as readonly string[]).includes(value);
}

export function adminServiceForCustomer(customer: { signupOnly?: boolean; planId: string }): AdminServiceId {
  if (customer.signupOnly || !customer.planId) {
    return "standard";
  }
  return adminServiceFromPlanId(customer.planId);
}

/** Standard and Hybrid share global nodes, so node user counts need both lists. */
export function customerServicesForNodes(service: AdminServiceId): AdminServiceId[] {
  return service === "workspace" ? ["workspace"] : ["standard", "hybrid"];
}

export function isAdminSliceFresh(loadedAt: number | undefined, now: number, force = false) {
  if (force || loadedAt == null) {
    return false;
  }
  return now - loadedAt < ADMIN_STATE_FRESH_MS;
}

/**
 * Replace one service's rows and keep the others.
 * A list payload has no credentials or payments, so an open detail keeps those fields.
 */
export function mergeAdminCustomers(
  current: readonly AdminCustomer[],
  service: AdminServiceId,
  incoming: readonly AdminCustomer[]
): AdminCustomer[] {
  const incomingIds = new Set(incoming.map((customer) => customer.id));
  const kept = current.filter(
    (customer) => adminServiceForCustomer(customer) !== service && !incomingIds.has(customer.id)
  );
  const merged = incoming.map((customer) => {
    const previous = current.find((item) => item.id === customer.id);
    if (!previous) {
      return customer;
    }
    return {
      ...customer,
      planChange: previous.planChange ?? customer.planChange,
      credentials: customer.credentials ?? previous.credentials ?? null,
      rotateHistory: customer.rotateHistory.length ? customer.rotateHistory : previous.rotateHistory,
      payments: customer.payments.length ? customer.payments : previous.payments,
      auditLogs: customer.auditLogs.length ? customer.auditLogs : previous.auditLogs,
    };
  });
  return [...kept, ...merged];
}

export function loadedCustomerServices(loaded: ReadonlySet<AdminServiceId>): AdminServiceId[] {
  const services = ADMIN_SERVICES.filter((service) => loaded.has(service));
  return services.length ? [...services] : [...ADMIN_SERVICES];
}
