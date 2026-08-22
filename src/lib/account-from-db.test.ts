import { SubscriptionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { toUiStatus } from "@/lib/account-from-db";

describe("account-from-db/toUiStatus", () => {
  it("keeps failed and unpaid subscriptions visible", () => {
    expect(toUiStatus(SubscriptionStatus.ACTIVE)).toBe("active");
    expect(toUiStatus(SubscriptionStatus.PROVISIONING)).toBe("provisioning");
    expect(toUiStatus(SubscriptionStatus.FAILED)).toBe("failed");
    expect(toUiStatus(SubscriptionStatus.UNPAID)).toBe("unpaid");
  });
});
