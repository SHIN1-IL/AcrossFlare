import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hmacSha256Hex } from "@/lib/payments/crypto";
import { verifyPaymentWebhook, WebhookVerifyError } from "@/lib/payments/verify";

const secret = "test-webhook-secret";

function internalRequest(body: object, timestampSec = Math.floor(Date.now() / 1000)) {
  const raw = JSON.stringify(body);
  const signature = hmacSha256Hex(secret, `${timestampSec}.${raw}`);
  return new Request("http://localhost/api/v1/payments/webhook", {
    method: "POST",
    headers: {
      "x-acrossflare-timestamp": String(timestampSec),
      "x-acrossflare-signature": `v1=${signature}`,
    },
    body: raw,
  });
}

describe("payments/verify", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.AUTH_SECRET = secret;
    process.env.PAYMENT_WEBHOOK_SECRET = secret;
    delete process.env.PORTONE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.PAYMENTWALL_SECRET;
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("accepts a signed internal success event", async () => {
    const verified = await verifyPaymentWebhook(
      internalRequest({
        paymentId: "pay_1",
        provider: PaymentProvider.PORTONE,
        status: "SUCCEEDED",
        amount: 19900,
        currency: "KRW",
      })
    );

    expect(verified).toMatchObject({
      paymentId: "pay_1",
      provider: PaymentProvider.PORTONE,
      status: PaymentStatus.SUCCEEDED,
      amount: 19900,
      currency: "KRW",
    });
  });

  it("rejects a bad signature", async () => {
    const request = internalRequest({
      paymentId: "pay_1",
      provider: PaymentProvider.PORTONE,
      status: "SUCCEEDED",
    });
    request.headers.set("x-acrossflare-signature", "v1=deadbeef");

    await expect(verifyPaymentWebhook(request)).rejects.toMatchObject({
      name: "WebhookVerifyError",
      code: "invalid_signature",
    } satisfies Partial<WebhookVerifyError>);
  });
});
