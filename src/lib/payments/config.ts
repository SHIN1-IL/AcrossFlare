import { PaymentProvider } from "@prisma/client";

const TIMESTAMP_TOLERANCE_SEC = 60 * 5;

export function webhookTimestampToleranceSec() {
  return TIMESTAMP_TOLERANCE_SEC;
}

export function isSimulateEnabled() {
  return process.env.PAYMENT_MODE === "simulate";
}

export function paymentWebhookSecret() {
  return process.env.PAYMENT_WEBHOOK_SECRET || process.env.AUTH_SECRET || "";
}

export function portoneWebhookSecret() {
  return process.env.PORTONE_WEBHOOK_SECRET || "";
}

export function stripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET || "";
}

export function paymentwallSecret() {
  return process.env.PAYMENTWALL_SECRET || "";
}

export function paymentwallProjectKey() {
  return process.env.PAYMENTWALL_PROJECT_KEY || "";
}

export function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || "";
}

export function portoneStoreId() {
  return process.env.PORTONE_STORE_ID || "";
}

export function portoneChannelKey() {
  return process.env.PORTONE_CHANNEL_KEY || "";
}

export function publicAppUrl() {
  return (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export function alipayProvider(): PaymentProvider {
  return process.env.PAYMENT_ALIPAY_PROVIDER === "paymentwall"
    ? PaymentProvider.PAYMENTWALL
    : PaymentProvider.STRIPE;
}
