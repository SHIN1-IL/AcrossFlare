import { PaymentProvider, PaymentStatus } from "@prisma/client";
import {
  lemonSqueezyWebhookSecret,
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

  if (headers.get("x-signature")) {
    return verifyLemon(headers, rawBody);
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
  const paymentId =
    stringField(data, ["paymentId", "merchant_uid", "customData"]) ||
    stringField(asRecord(data.payment) ?? {}, ["paymentId", "id", "merchant_uid"]);
  const externalId =
    stringField(data, ["transactionId", "imp_uid", "txId"]) ||
    stringField(asRecord(data.payment) ?? {}, ["transactionId", "id"]) ||
    id;

  if (!paymentId) {
    throw new WebhookVerifyError("missing_payment_id", 400);
  }

  const status = portoneEventStatus(type, optionalString(data.status) ?? optionalString(asRecord(data.payment)?.status));
  if (!status) {
    throw new WebhookVerifyError("ignored_event", 200);
  }

  const amountRecord = asRecord(data.amount) ?? asRecord(asRecord(data.payment)?.amount) ?? data;
  const currency =
    optionalString(data.currency) ||
    optionalString(asRecord(data.payment)?.currency) ||
    optionalString(amountRecord.currency);

  return {
    eventId: `portone:${id}`,
    provider: PaymentProvider.PORTONE,
    paymentId,
    externalId,
    status,
    amount: numberField(amountRecord, ["total", "paid", "amount"]),
    currency: normalizePortoneCurrency(currency),
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
  const status = stripeEventStatus(String(body.type ?? ""), object);

  if (!status) {
    throw new WebhookVerifyError("ignored_event", 200);
  }

  return {
    eventId: `stripe:${String(body.id ?? `t${timestampSec}`)}`,
    provider: PaymentProvider.STRIPE,
    paymentId,
    externalId: stringField(object, ["id", "payment_intent"]) || String(body.id ?? paymentId),
    status,
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
  const status = paymentwallPingbackStatus(type);

  if (!status) {
    throw new WebhookVerifyError("ignored_event", 200);
  }

  return {
    eventId: `paymentwall:${params.get("ref") ?? paymentId}:${type}`,
    provider: PaymentProvider.PAYMENTWALL,
    paymentId,
    externalId: params.get("ref") ?? paymentId,
    status,
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

function normalizePortoneCurrency(value?: string) {
  if (!value) {
    return undefined;
  }

  const upper = value.trim().toUpperCase();
  return upper.startsWith("CURRENCY_") ? upper.slice("CURRENCY_".length) : upper;
}

function verifyLemon(headers: Headers, rawBody: string): VerifiedWebhook {
  const secret = lemonSqueezyWebhookSecret();
  if (!secret) {
    throw new WebhookVerifyError("missing_secret");
  }

  const signature = headers.get("x-signature") ?? "";
  const expected = hmacSha256Hex(secret, rawBody);
  if (!signature || !safeEqual(expected, signature)) {
    throw new WebhookVerifyError("invalid_signature");
  }

  const body = parseJson(rawBody);
  const meta = asRecord(body.meta) ?? {};
  const eventName = optionalString(meta.event_name) ?? headers.get("x-event-name") ?? "";
  if (eventName !== "order_created") {
    throw new WebhookVerifyError("ignored_event", 200);
  }

  const data = asRecord(body.data) ?? {};
  const attributes = asRecord(data.attributes) ?? {};
  const status = (optionalString(attributes.status) ?? "").toLowerCase();
  if (status !== "paid") {
    throw new WebhookVerifyError("ignored_event", 200);
  }

  const custom = asRecord(meta.custom_data) ?? {};
  const paymentId = paymentIdField(custom.payment_id) ?? paymentIdField(custom.paymentId);
  const orderId = paymentIdField(data.id);
  if (!paymentId || !orderId) {
    throw new WebhookVerifyError("missing_payment_id", 400);
  }

  const currency = optionalString(attributes.currency)?.toUpperCase();
  const subtotal = numberField(attributes, ["subtotal"]);
  if (!currency || subtotal == null) {
    throw new WebhookVerifyError("invalid_payload", 400);
  }

  return {
    eventId: `lemonsqueezy:${orderId}`,
    provider: PaymentProvider.LEMONSQUEEZY,
    paymentId,
    externalId: orderId,
    status: PaymentStatus.SUCCEEDED,
    amount: fromStripeMinorUnits(subtotal, currency),
    currency,
  };
}

function paymentIdField(value: unknown) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function asProvider(value: unknown): PaymentProvider | null {
  if (
    value === PaymentProvider.PORTONE ||
    value === PaymentProvider.STRIPE ||
    value === PaymentProvider.PAYMENTWALL ||
    value === PaymentProvider.LEMONSQUEEZY
  ) {
    return value;
  }

  return null;
}

function portoneEventStatus(
  type: string,
  dataStatus?: string
): Extract<PaymentStatus, "SUCCEEDED" | "FAILED"> | null {
  const event = type.toLowerCase();
  const status = (dataStatus ?? "").toLowerCase();
  if (event === "transaction.paid" || status === "paid") {
    return PaymentStatus.SUCCEEDED;
  }
  if (event.includes("fail") || status.includes("fail")) {
    return PaymentStatus.FAILED;
  }
  if (
    (event.includes("cancel") || status.includes("cancel")) &&
    !event.includes("partial") &&
    !status.includes("partial")
  ) {
    return PaymentStatus.FAILED;
  }
  return null;
}

const STRIPE_SUCCEEDED_TYPES = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "payment_intent.succeeded",
  "invoice.paid",
  "invoice.payment_succeeded",
  "charge.succeeded",
]);

const STRIPE_FAILED_TYPES = new Set([
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
  "invoice.payment_failed",
  "charge.failed",
  "charge.expired",
]);

function stripeEventStatus(
  type: string,
  object: Record<string, unknown>
): Extract<PaymentStatus, "SUCCEEDED" | "FAILED"> | null {
  if (STRIPE_FAILED_TYPES.has(type)) {
    return PaymentStatus.FAILED;
  }

  if (type === "checkout.session.completed") {
    const paymentStatus = optionalString(object.payment_status);
    if (paymentStatus === "paid" || paymentStatus === "no_payment_required" || !paymentStatus) {
      return PaymentStatus.SUCCEEDED;
    }

    return null;
  }

  if (STRIPE_SUCCEEDED_TYPES.has(type)) {
    return PaymentStatus.SUCCEEDED;
  }

  return null;
}

function paymentwallPingbackStatus(type: string): Extract<PaymentStatus, "SUCCEEDED" | "FAILED"> | null {
  if (type === "0") {
    return PaymentStatus.SUCCEEDED;
  }

  if (type === "1" || type === "2") {
    return PaymentStatus.FAILED;
  }

  return null;
}
