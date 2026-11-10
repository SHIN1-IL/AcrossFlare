import { describe, expect, it } from "vitest";
import { applyEsimSaleLock } from "@/lib/esim/lock";

describe("applyEsimSaleLock", () => {
  it("locks the chosen sale state", () => {
    expect(applyEsimSaleLock({ enabled: false, enabledLocked: false }, "lock", true)).toEqual({
      ok: true,
      next: { enabled: true, enabledLocked: true },
    });
  });

  it("keeps the sale state when the lock is released", () => {
    expect(applyEsimSaleLock({ enabled: true, enabledLocked: true }, "unlock")).toEqual({
      ok: true,
      next: { enabled: true, enabledLocked: false },
    });
  });

  it("refuses to flip a locked sale", () => {
    expect(applyEsimSaleLock({ enabled: true, enabledLocked: true }, "lock", false)).toEqual({
      ok: false,
      error: "locked",
    });
  });
});
