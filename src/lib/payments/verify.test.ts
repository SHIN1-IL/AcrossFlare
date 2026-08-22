import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hmacSha256Hex, md5Hex } from "@/lib/payments/crypto";
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

function stripeRequest(body: object, timestampSec = Math.floor(Date.now() / 1000)) {
  const raw = JSON.stringify(body);
  const signature = hmacSha256Hex(secret, `${timestampSec}.${raw}`);
  return new Request("http://localhost/api/v1/payments/webhook", {
    method: "POST",
    headers: {
      "stripe-signature": `t=${timestampSec},v1=${signature}`,
    },
    body: raw,
  });
}

function paymentwallRequest(params: Record<string, string>) {
  const entries = Object.entries(params)
    .filter(([key]) => key !== "sig")
    .sort(([a], [b]) => a.localeCompare(b));
  const sig = md5Hex(`${entries.map(([key, value]) => `${key}=${value}`).join("")}${secret}`);
  return new Request(`http://localhost/api/v1/payments/webhook?${new URLSearchParams({ ...params, sig })}`);
}

describe("payments/verify", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.AUTH_SECRET = secret;
    process.env.PAYMENT_WEBHOOK_SECRET = secret;
    process.env.STRIPE_WEBHOOK_SECRET = secret;
    process.env.PAYMENTWALL_SECRET = secret;
    delete process.env.PORTONE_WEBHOOK_SECRET;
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

  it("accepts Stripe checkout.session.completed when paid", async () => {
    const verified = await verifyPaymentWebhook(
      stripeRequest({
        id: "evt_paid",
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_1",
            payment_status: "paid",
            metadata: { paymentId: "pay_stripe" },
            currency: "usd",
            amount_total: 1500,
          },
        },
      })
    );

    expect(verified).toMatchObject({
      paymentId: "pay_stripe",
      provider: PaymentProvider.STRIPE,
      status: PaymentStatus.SUCCEEDED,
      amount: 15,
      currency: "USD",
    });
  });

  it("treats Stripe payment_intent.payment_failed as failed", async () => {
    const verified = await verifyPaymentWebhook(
      stripeRequest({
        id: "evt_fail",
        type: "payment_intent.payment_failed",
        data: {
          object: {
            id: "pi_1",
            metadata: { paymentId: "pay_stripe" },
          },
        },
      })
    );

    expect(verified.status).toBe(PaymentStatus.FAILED);
  });

  it("ignores signed Stripe events that are not payment outcomes", async () => {
    await expect(
      verifyPaymentWebhook(
        stripeRequest({
          id: "evt_other",
          type: "charge.refunded",
          data: {
            object: {
              id: "ch_1",
              metadata: { paymentId: "pay_stripe" },
            },
          },
        })
      )
    ).rejects.toMatchObject({
      code: "ignored_event",
      status: 200,
    } satisfies Partial<WebhookVerifyError>);
  });

  it("ignores unpaid Stripe checkout sessions", async () => {
    await expect(
      verifyPaymentWebhook(
        stripeRequest({
          id: "evt_unpaid",
          type: "checkout.session.completed",
          data: {
            object: {
              id: "cs_unpaid",
              payment_status: "unpaid",
              metadata: { paymentId: "pay_stripe" },
            },
          },
        })
      )
    ).rejects.toMatchObject({ code: "ignored_event" } satisfies Partial<WebhookVerifyError>);
  });

  it("treats Paymentwall type 0 as success and cancel as failed", async () => {
    const success = await verifyPaymentWebhook(
      paymentwallRequest({ uid: "user_1", goodsid: "pay_wall", ref: "ref_1", type: "0" })
    );
    expect(success).toMatchObject({
      paymentId: "pay_wall",
      provider: PaymentProvider.PAYMENTWALL,
      status: PaymentStatus.SUCCEEDED,
    });

    const canceled = await verifyPaymentWebhook(
      paymentwallRequest({ uid: "user_1", goodsid: "pay_wall", ref: "ref_2", type: "1" })
    );
    expect(canceled.status).toBe(PaymentStatus.FAILED);

    const chargeback = await verifyPaymentWebhook(
      paymentwallRequest({ uid: "user_1", goodsid: "pay_wall", ref: "ref_3", type: "2" })
    );
    expect(chargeback.status).toBe(PaymentStatus.FAILED);
  });

  it("ignores other Paymentwall pingback types", async () => {
    await expect(
      verifyPaymentWebhook(
        paymentwallRequest({ uid: "user_1", goodsid: "pay_wall", ref: "ref_4", type: "3" })
      )
    ).rejects.toMatchObject({ code: "ignored_event" } satisfies Partial<WebhookVerifyError>);
  });
});
