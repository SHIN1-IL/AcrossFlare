import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notifyOpsPayment, notifyOpsSignup, sendOpsEmail } from "@/lib/ops-notify";

describe("ops-notify", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.ADMIN_OWNER_EMAIL = "ops@acrossflare.com";
    process.env.RESEND_API_KEY = "re_test";
    process.env.OPS_NOTIFY_FROM = "AcrossFlare <ops@acrossflare.com>";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.RESEND_API_KEY;
    delete process.env.OPS_NOTIFY_FROM;
    vi.restoreAllMocks();
  });

  it("skips when Resend is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    await expect(sendOpsEmail("subject", "body")).resolves.toEqual({
      ok: false,
      reason: "not_configured",
    });
  });

  it("sends signup and payment emails through Resend", async () => {
    const bodies: string[] = [];
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(String(init?.body ?? ""));
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    await expect(notifyOpsSignup("new@example.com")).resolves.toEqual({ ok: true });
    await expect(
      notifyOpsPayment({
        email: "paid@example.com",
        planId: "global-standard",
        amount: 9900,
        currency: "KRW",
      })
    ).resolves.toEqual({ ok: true });

    expect(bodies).toHaveLength(2);
    const first = JSON.parse(bodies[0] ?? "{}");
    expect(first.to).toEqual(["ops@acrossflare.com"]);
    expect(first.subject).toContain("new@example.com");
    const second = JSON.parse(bodies[1] ?? "{}");
    expect(second.text).toContain("global-standard");
    expect(second.text).toContain("9900");
  });

  it("reports send_failed on non-2xx", async () => {
    globalThis.fetch = vi.fn(async () => new Response("nope", { status: 401 })) as typeof fetch;
    await expect(sendOpsEmail("subject", "body")).resolves.toEqual({
      ok: false,
      reason: "send_failed",
    });
  });
});
