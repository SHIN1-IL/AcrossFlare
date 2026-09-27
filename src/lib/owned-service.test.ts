import { describe, expect, it } from "vitest";
import { hasActiveService, pickSameService } from "@/lib/owned-service";

const now = new Date("2026-09-27T00:00:00.000Z");
const later = new Date("2026-10-27T00:00:00.000Z");
const earlier = new Date("2026-08-27T00:00:00.000Z");

describe("owned service lanes", () => {
  it("keeps a hybrid subscription when the new plan is standard", () => {
    const rows = [{ id: "hybrid-sub", planId: "hybrid-lite" }];
    expect(pickSameService(rows, "global-standard")).toBeUndefined();
    expect(pickSameService(rows, "hybrid-year")?.id).toBe("hybrid-sub");
  });

  it("blocks a second purchase of a kind that is still active", () => {
    const rows = [
      { planId: "hybrid-lite", status: "ACTIVE", expiresAt: later },
      { planId: "workspace-a", status: "ACTIVE", expiresAt: later },
    ];

    expect(hasActiveService(rows, "hybrid-year", now)).toBe(true);
    expect(hasActiveService(rows, "global-standard", now)).toBe(false);
    expect(hasActiveService(rows, "workspace-b", now)).toBe(true);
  });

  it("allows the same kind again after it expires or fails", () => {
    expect(
      hasActiveService([{ planId: "global-standard", status: "ACTIVE", expiresAt: earlier }], "global-lite", now)
    ).toBe(false);
    expect(
      hasActiveService([{ planId: "hybrid-lite", status: "FAILED", expiresAt: later }], "hybrid-lite", now)
    ).toBe(false);
    expect(
      hasActiveService([{ planId: "global-standard", status: "PROVISIONING", expiresAt: earlier }], "global-year", now)
    ).toBe(true);
  });
});
