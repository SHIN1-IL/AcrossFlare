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

export function alipayProvider(): PaymentProvider {
  return process.env.PAYMENT_ALIPAY_PROVIDER === "paymentwall"
    ? PaymentProvider.PAYMENTWALL
    : PaymentProvider.STRIPE;
}
