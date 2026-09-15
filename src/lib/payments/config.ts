import { PaymentProvider } from "@prisma/client";

const TIMESTAMP_TOLERANCE_SEC = 60 * 5;

export function webhookTimestampToleranceSec() {
  return TIMESTAMP_TOLERANCE_SEC;
}

function env(name: string) {
  return process.env[name] || "";
}

export function isSimulateEnabled() {
  return env("PAYMENT_MODE") === "simulate";
}

export function paymentWebhookSecret() {
  return env("PAYMENT_WEBHOOK_SECRET") || env("AUTH_SECRET");
}

export function portoneWebhookSecret() {
  return env("PORTONE_WEBHOOK_SECRET");
}

export function stripeWebhookSecret() {
  return env("STRIPE_WEBHOOK_SECRET");
}

export function paymentwallSecret() {
  return env("PAYMENTWALL_SECRET");
}

export function paymentwallProjectKey() {
  return env("PAYMENTWALL_PROJECT_KEY");
}

export function stripeSecretKey() {
  return env("STRIPE_SECRET_KEY");
}

export function portoneStoreId() {
  return env("PORTONE_STORE_ID");
}

export function portoneChannelKey() {
  return env("PORTONE_CHANNEL_KEY");
}

export function publicAppUrl() {
  return (env("APP_URL") || env("NEXT_PUBLIC_APP_URL") || "http://localhost:3000").replace(/\/$/, "");
}

export function alipayProvider(): PaymentProvider {
  return env("PAYMENT_ALIPAY_PROVIDER") === "paymentwall"
    ? PaymentProvider.PAYMENTWALL
    : PaymentProvider.STRIPE;
}
