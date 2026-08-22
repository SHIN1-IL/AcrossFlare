import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkoutReturnUrl } from "@/lib/payments/start";
import { xuiTlsDispatcher } from "@/lib/provision/xui";

describe("payments/start return url", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.APP_URL = "https://acrossflare.com";
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("builds a checkout return URL with the payment id", () => {
    expect(
      checkoutReturnUrl({
        locale: "ko",
        product: "global",
        planId: "global-standard",
        paymentId: "pay_1",
      })
    ).toBe("https://acrossflare.com/ko/checkout?product=global&plan=global-standard&paymentId=pay_1");
  });
});

describe("xui tls", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env = { ...env };
    process.env.XUI_TLS_INSECURE = "1";
    delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("scopes insecure TLS to the panel dispatcher", () => {
    expect(xuiTlsDispatcher()).toBeDefined();
    expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBeUndefined();
  });
});
