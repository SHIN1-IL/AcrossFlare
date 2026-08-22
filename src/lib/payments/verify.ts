import { PaymentProvider, PaymentStatus } from "@prisma/client";
import {
  paymentwallSecret,
  paymentWebhookSecret,
  portoneWebhookSecret,
  stripeWebhookSecret,
  webhookTimestampToleranceSec,
} from "@/lib/payments/config";
import {
  anySafeEqual,
  decodeStandardWebhookSecret,
  hmacSha256Base64,
  hmacSha256Hex,
  isFreshTimestamp,
  md5Hex,
  safeEqual,
} from "@/lib/payments/crypto";
import { fromStripeMinorUnits } from "@/lib/payments/quote";

export class WebhookVerifyError extends Error {
  constructor(
    public code: string,
    public status = 401
  ) {
    super(code);
    this.name = "WebhookVerifyError";
  }
}

export type VerifiedWebhook = {
  eventId: string;
  provider: PaymentProvider;
  paymentId: string;
  externalId: string;
  status: Extract<PaymentStatus, "SUCCEEDED" | "FAILED">;
  amount?: number;
  currency?: string;
};

export async function verifyPaymentWebhook(request: Request): Promise<VerifiedWebhook> {
  const url = new URL(request.url);

  if (isPaymentwallPingback(url.searchParams)) {
    return verifyPaymentwall(url.searchParams);
  }

  const rawBody = await request.text();
  const headers = request.headers;

  if (headers.get("webhook-signature") && headers.get("webhook-id")) {
    return verifyPortone(headers, rawBody);
  }

  if (headers.get("stripe-signature")) {
    return verifyStripe(headers, rawBody);
  }

  if (headers.get("x-acrossflare-signature")) {
    return verifyInternal(headers, rawBody);
  }

  throw new WebhookVerifyError("unknown_provider", 400);
}

function verifyPortone(headers: Headers, rawBody: string): VerifiedWebhook {
  const secret = portoneWebhookSecret();
  if (!secret) {
    throw new WebhookVerifyError("missing_secret");
  }

  const id = headers.get("webhook-id") ?? "";
  const timestamp = headers.get("webhook-timestamp") ?? "";
  const signatureHeader = headers.get("webhook-signature") ?? "";
  const timestampSec = Number(timestamp);

  if (!id || !Number.isFinite(timestampSec) || !isFreshTimestamp(timestampSec, webhookTimestampToleranceSec())) {
    throw new WebhookVerifyError("stale_or_invalid_timestamp");
  }

  const signed = `${id}.${timestamp}.${rawBody}`;
  const expected = hmacSha256Base64(decodeStandardWebhookSecret(secret), signed);
  const candidates = signatureHeader
    .split(" ")
    .map((part) => part.replace(/^v1,/, "").trim())
    .filter(Boolean);

  if (!anySafeEqual(expected, candidates)) {
    throw new WebhookVerifyError("invalid_signature");
  }

  const body = parseJson(rawBody);
  const data = asRecord(body.data) ?? body;
  const type = String(body.type ?? data.status ?? "");
  const paymentId = stringField(data, ["paymentId", "merchant_uid", "customData"]);
  const externalId = stringField(data, ["transactionId", "imp_uid", "txId"]) || id;

  if (!paymentId) {
    throw new WebhookVerifyError("missing_payment_id", 400);
  }

  return {
    eventId: `portone:${id}`,
    provider: PaymentProvider.PORTONE,
    paymentId,
    externalId,
    status: isFailureType(type) ? PaymentStatus.FAILED : PaymentStatus.SUCCEEDED,
    amount: numberField(asRecord(data.amount) ?? data, ["total", "paid", "amount"]),
    currency: optionalString(data.currency),
  };
}

function verifyStripe(headers: Headers, rawBody: string): VerifiedWebhook {
  const secret = stripeWebhookSecret();
  if (!secret) {
    throw new WebhookVerifyError("missing_secret");
  }

  const header = headers.get("stripe-signature") ?? "";
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [key, ...rest] = part.split("=");
      return [key, rest.join("=")];
    })
  );
  const timestampSec = Number(parts.t);
  const signatures = header
    .split(",")
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  if (!Number.isFinite(timestampSec) || !isFreshTimestamp(timestampSec, webhookTimestampToleranceSec())) {
    throw new WebhookVerifyError("stale_or_invalid_timestamp");
  }

  const expected = hmacSha256Hex(secret, `${timestampSec}.${rawBody}`);
  if (!anySafeEqual(expected, signatures)) {
    throw new WebhookVerifyError("invalid_signature");
  }

  const body = parseJson(rawBody);
  const object = asRecord(asRecord(body.data)?.object) ?? {};
  const metadata = asRecord(object.metadata) ?? {};
  const paymentId =
    stringField(metadata, ["paymentId", "payment_id"]) ||
    optionalString(object.client_reference_id);

  if (!paymentId) {
    throw new WebhookVerifyError("missing_payment_id", 400);
  }

  const currency = optionalString(object.currency)?.toUpperCase();
  const minor = numberField(object, ["amount_total", "amount"]);

  return {
    eventId: `stripe:${String(body.id ?? `t${timestampSec}`)}`,
    provider: PaymentProvider.STRIPE,
    paymentId,
    externalId: stringField(object, ["id", "payment_intent"]) || String(body.id ?? paymentId),
    status: String(body.type ?? "").includes("failed") ? PaymentStatus.FAILED : PaymentStatus.SUCCEEDED,
    amount: minor == null || !currency ? undefined : fromStripeMinorUnits(minor, currency),
    currency,
  };
}

function verifyInternal(headers: Headers, rawBody: string): VerifiedWebhook {
  const secret = paymentWebhookSecret();
  if (!secret) {
    throw new WebhookVerifyError("missing_secret");
  }

  const timestampSec = Number(headers.get("x-acrossflare-timestamp") ?? "");
  const signature = (headers.get("x-acrossflare-signature") ?? "").replace(/^v1=/, "");

  if (!Number.isFinite(timestampSec) || !isFreshTimestamp(timestampSec, webhookTimestampToleranceSec())) {
    throw new WebhookVerifyError("stale_or_invalid_timestamp");
  }

  const expected = hmacSha256Hex(secret, `${timestampSec}.${rawBody}`);
  if (!safeEqual(expected, signature)) {
    throw new WebhookVerifyError("invalid_signature");
  }

  const body = parseJson(rawBody);
  const paymentId = optionalString(body.paymentId);
  const provider = asProvider(body.provider);
  const status = body.status === "FAILED" ? PaymentStatus.FAILED : PaymentStatus.SUCCEEDED;

  if (!paymentId || !provider) {
    throw new WebhookVerifyError("invalid_payload", 400);
  }

  return {
    eventId: optionalString(body.eventId) || `internal:${paymentId}:${timestampSec}`,
    provider,
    paymentId,
    externalId: optionalString(body.externalId) || `internal_${paymentId}`,
    status,
    amount: numberField(body, ["amount"]),
    currency: optionalString(body.currency),
  };
}

function verifyPaymentwall(params: URLSearchParams): VerifiedWebhook {
  const secret = paymentwallSecret();
  if (!secret) {
    throw new WebhookVerifyError("missing_secret");
  }

  const given = params.get("sig") ?? "";
  const entries = [...params.entries()]
    .filter(([key]) => key !== "sig")
    .sort(([a], [b]) => a.localeCompare(b));
  const expected = md5Hex(`${entries.map(([key, value]) => `${key}=${value}`).join("")}${secret}`);

  if (!safeEqual(expected, given)) {
    throw new WebhookVerifyError("invalid_signature");
  }

  const paymentId = params.get("goodsid") ?? params.get("uid") ?? "";
  if (!paymentId) {
    throw new WebhookVerifyError("missing_payment_id", 400);
  }

  const type = params.get("type") ?? "0";

  return {
    eventId: `paymentwall:${params.get("ref") ?? paymentId}:${type}`,
    provider: PaymentProvider.PAYMENTWALL,
    paymentId,
    externalId: params.get("ref") ?? paymentId,
    status: type === "2" ? PaymentStatus.FAILED : PaymentStatus.SUCCEEDED,
  };
}

function isPaymentwallPingback(params: URLSearchParams) {
  return params.has("sig") && (params.has("uid") || params.has("goodsid")) && params.has("ref");
}

function parseJson(raw: string) {
  const value = JSON.parse(raw) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new WebhookVerifyError("invalid_payload", 400);
  }

  return value as Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function stringField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = optionalString(record[key]);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function numberField(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function asProvider(value: unknown): PaymentProvider | null {
  if (value === PaymentProvider.PORTONE || value === PaymentProvider.STRIPE || value === PaymentProvider.PAYMENTWALL) {
    return value;
  }

  return null;
}

function isFailureType(type: string) {
  const lower = type.toLowerCase();
  return lower.includes("fail") || lower.includes("cancel") || lower.includes("virtual_account_issued");
}
