import { describe, expect, it } from "vitest";
import type { AdminCustomer } from "@/lib/admin";
import {
  adminQueueCounts,
  canRetryProvision,
  currentFulfillmentStep,
  fulfillmentSteps,
  isExpiringSoon,
  matchesAdminQueueFilter,
  paginateItems,
  parseAdminQueueFilter,
  sortAdminQueue,
} from "@/lib/admin-queue";

function customer(overrides: Partial<AdminCustomer> = {}): AdminCustomer {
  return {
    id: "1",
    product: "global",
    email: "a@example.com",
    planId: "global-lite",
    planName: "Month",
    expiresAt: "2026-09-30T00:00:00.000Z",
    memo: "",
    status: "active",
    nodeIds: [],
    createdAt: "2026-08-01T00:00:00.000Z",
    credentials: null,
    rotateHistory: [],
    planChange: null,
    provisionStep: "ready",
    provisionError: "",
    payments: [],
    auditLogs: [],
    ...overrides,
  };
}

describe("admin-queue", () => {
  it("parses known status filters and ignores junk", () => {
    expect(parseAdminQueueFilter("failed")).toBe("failed");
    expect(parseAdminQueueFilter("expiring")).toBe("expiring");
    expect(parseAdminQueueFilter("nope")).toBe("all");
    expect(parseAdminQueueFilter(undefined)).toBe("all");
  });

  it("treats the next 7 days as expiring and ignores past dates", () => {
    const now = Date.parse("2026-08-27T00:00:00.000Z");
    expect(isExpiringSoon("2026-09-01T00:00:00.000Z", now)).toBe(true);
    expect(isExpiringSoon("2026-10-01T00:00:00.000Z", now)).toBe(false);
    expect(isExpiringSoon("2026-08-20T00:00:00.000Z", now)).toBe(false);
  });

  it("sorts failed, issuing, unpaid, then expiring ahead of healthy rows", () => {
    const now = Date.parse("2026-08-27T00:00:00.000Z");
    const rows = sortAdminQueue(
      [
        customer({ id: "ok", email: "ok@example.com", status: "active", expiresAt: "2026-12-01T00:00:00.000Z" }),
        customer({ id: "pay", email: "pay@example.com", status: "unpaid" }),
        customer({ id: "soon", email: "soon@example.com", status: "active", expiresAt: "2026-08-30T00:00:00.000Z" }),
        customer({ id: "fail", email: "fail@example.com", status: "failed", provisionStep: "xui" }),
        customer({ id: "run", email: "run@example.com", status: "provisioning", provisionStep: "backup" }),
      ],
      now
    );

    expect(rows.map((row) => row.id)).toEqual(["fail", "run", "pay", "soon", "ok"]);
  });

  it("counts queue buckets and matches filters", () => {
    const now = Date.parse("2026-08-27T00:00:00.000Z");
    const rows = [
      customer({ id: "fail", status: "failed" }),
      customer({ id: "run", status: "provisioning" }),
      customer({ id: "pay", status: "unpaid" }),
      customer({ id: "soon", status: "active", expiresAt: "2026-08-30T00:00:00.000Z" }),
      customer({ id: "ok", status: "active", expiresAt: "2026-12-01T00:00:00.000Z" }),
    ];

    expect(adminQueueCounts(rows, now)).toEqual({
      failed: 1,
      provisioning: 1,
      unpaid: 1,
      expiring: 1,
    });
    expect(rows.filter((row) => matchesAdminQueueFilter(row, "unpaid", now)).map((row) => row.id)).toEqual(["pay"]);
    expect(rows.filter((row) => matchesAdminQueueFilter(row, "expiring", now)).map((row) => row.id)).toEqual(["soon"]);
  });

  it("shows payment as the current unpaid step and xui as the failed step", () => {
    const unpaid = currentFulfillmentStep(customer({ status: "unpaid", provisionStep: "queued" }));
    expect(unpaid).toEqual({ id: "payment", status: "pending" });

    const failed = fulfillmentSteps(
      customer({ status: "failed", provisionStep: "xui", provisionError: "xui timeout" })
    );
    expect(failed.map((step) => `${step.id}:${step.status}`)).toEqual([
      "payment:done",
      "xui:failed",
      "backup:pending",
      "ready:pending",
    ]);
    expect(canRetryProvision(customer({ status: "failed" }))).toBe(true);
    expect(canRetryProvision(customer({ status: "unpaid" }))).toBe(false);
    expect(canRetryProvision(customer({ status: "active" }))).toBe(false);
  });

  it("skips backup on marketing rows", () => {
    const steps = fulfillmentSteps(
      customer({
        product: "marketing",
        status: "provisioning",
        provisionStep: "xui",
      })
    );
    expect(steps.map((step) => step.id)).toEqual(["payment", "xui", "ready"]);
    expect(currentFulfillmentStep(customer({ product: "marketing", status: "active" }))).toEqual({
      id: "ready",
      status: "done",
    });
  });

  it("pages filtered rows and clamps past the last page", () => {
    const rows = Array.from({ length: 12 }, (_, index) => customer({ id: String(index), email: `u${index}@example.com` }));
    const first = paginateItems(rows, 1, 5);
    expect(first.items).toHaveLength(5);
    expect(first.pageCount).toBe(3);
    expect(paginateItems(rows, 99, 5).page).toBe(3);
  });
});
