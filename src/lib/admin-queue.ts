import type { AdminCustomer, JobStep, JobStepStatus } from "@/lib/admin";
import { stepsFromProvision, provisionSteps } from "@/lib/admin";

export const ADMIN_QUEUE_FILTERS = ["all", "failed", "provisioning", "unpaid", "expiring"] as const;

export type AdminQueueFilter = (typeof ADMIN_QUEUE_FILTERS)[number];

export const EXPIRING_WITHIN_MS = 7 * 24 * 60 * 60 * 1000;

export function parseAdminQueueFilter(value: string | null | undefined): AdminQueueFilter {
  if (value && (ADMIN_QUEUE_FILTERS as readonly string[]).includes(value)) {
    return value as AdminQueueFilter;
  }
  return "all";
}

export function isExpiringSoon(expiresAt: string, now = Date.now()) {
  const expires = new Date(expiresAt).getTime();
  if (Number.isNaN(expires)) {
    return false;
  }
  return expires >= now && expires <= now + EXPIRING_WITHIN_MS;
}

export function matchesAdminQueueFilter(
  customer: AdminCustomer,
  filter: AdminQueueFilter,
  now = Date.now()
) {
  switch (filter) {
    case "failed":
      return customer.status === "failed";
    case "provisioning":
      return customer.status === "provisioning";
    case "unpaid":
      return customer.status === "unpaid";
    case "expiring":
      return customer.status === "active" && isExpiringSoon(customer.expiresAt, now);
    default:
      return true;
  }
}

export function sortAdminQueue(customers: AdminCustomer[], now = Date.now()) {
  return customers.slice().sort((a, b) => {
    const delta = queuePriority(a, now) - queuePriority(b, now);
    if (delta !== 0) {
      return delta;
    }
    return a.email.localeCompare(b.email);
  });
}

export function adminQueueCounts(customers: AdminCustomer[], now = Date.now()) {
  return {
    failed: customers.filter((customer) => customer.status === "failed").length,
    provisioning: customers.filter((customer) => customer.status === "provisioning").length,
    unpaid: customers.filter((customer) => customer.status === "unpaid").length,
    expiring: customers.filter((customer) => customer.status === "active" && isExpiringSoon(customer.expiresAt, now))
      .length,
  };
}

export function canRetryProvision(customer: AdminCustomer) {
  return customer.status === "failed" || customer.status === "provisioning";
}

export const ADMIN_CUSTOMER_PAGE_SIZE = 50;

export function parseAdminPage(value: string | null | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function paginateItems<T>(items: T[], page: number, pageSize = ADMIN_CUSTOMER_PAGE_SIZE) {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(page, 1), pageCount);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageCount,
    total,
  };
}

export function fulfillmentSteps(customer: AdminCustomer): JobStep[] {
  const payment: JobStep = {
    id: "payment",
    status: customer.status === "unpaid" ? "pending" : "done",
  };

  if (customer.status === "unpaid") {
    return [payment, ...provisionSteps(customer.product).map((step) => ({ ...step, status: "pending" as const }))];
  }

  return [payment, ...stepsFromProvision(customer.product, customer.status, customer.provisionStep)];
}

export function currentFulfillmentStep(customer: AdminCustomer): JobStep {
  const current = fulfillmentSteps(customer).find((step) => step.status !== "done");
  return current ?? { id: "ready", status: "done" };
}

export function stepTone(status: JobStepStatus): "ok" | "warn" | "neutral" {
  if (status === "failed") {
    return "warn";
  }
  if (status === "done" || status === "running") {
    return "ok";
  }
  return "neutral";
}

function queuePriority(customer: AdminCustomer, now: number) {
  if (customer.status === "failed") {
    return 0;
  }
  if (customer.status === "provisioning") {
    return 1;
  }
  if (customer.status === "unpaid") {
    return 2;
  }
  if (isExpiringSoon(customer.expiresAt, now)) {
    return 3;
  }
  return 4;
}
