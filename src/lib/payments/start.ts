import { PaymentMethod, PaymentProvider, type Payment, type Plan } from "@prisma/client";
import type { AppLocale } from "@/i18n/routing";
import {
  paymentwallProjectKey,
  paymentwallSecret,
  portoneChannelKey,
  portoneStoreId,
  publicAppUrl,
  stripeSecretKey,
} from "@/lib/payments/config";
import { md5Hex } from "@/lib/payments/crypto";
import {
  portoneCurrency,
  portoneCustomerName,
  portoneLocale,
  type PortOneCheckout,
} from "@/lib/payments/portone";
import { toStripeMinorUnits } from "@/lib/payments/quote";

export class CheckoutStartError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = "CheckoutStartError";
  }
}

export type { PortOneCheckout };

export type LiveCheckoutSession = {
  redirectUrl?: string;
  portone?: PortOneCheckout;
};

export function checkoutReturnUrl(input: {
  locale: AppLocale;
  product: string;
  planId: string;
  paymentId: string;
  canceled?: boolean;
}) {
  const params = new URLSearchParams({
    product: input.product,
    plan: input.planId,
    paymentId: input.paymentId,
  });
  if (input.canceled) {
    params.set("canceled", "1");
  }

  return `${publicAppUrl()}/${input.locale}/checkout?${params.toString()}`;
}

export async function startProviderCheckout(input: {
  payment: Payment;
  plan: Plan;
  email: string;
  product: string;
}): Promise<LiveCheckoutSession> {
  const locale = input.payment.locale as AppLocale;
  const successUrl = checkoutReturnUrl({
    locale,
    product: input.product,
    planId: input.plan.id,
    paymentId: input.payment.id,
  });
  const cancelUrl = checkoutReturnUrl({
    locale,
    product: input.product,
    planId: input.plan.id,
    paymentId: input.payment.id,
    canceled: true,
  });

  if (input.payment.provider === PaymentProvider.STRIPE) {
    return { redirectUrl: await createStripeCheckout(input, successUrl, cancelUrl) };
  }

  if (input.payment.provider === PaymentProvider.PAYMENTWALL) {
    return { redirectUrl: createPaymentwallCheckout(input, successUrl) };
  }

  return { portone: createPortoneCheckout(input, successUrl) };
}

async function createStripeCheckout(
  input: { payment: Payment; plan: Plan },
  successUrl: string,
  cancelUrl: string
) {
  const secret = stripeSecretKey();
  if (!secret) {
    throw new CheckoutStartError("stripe_not_configured");
  }

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", successUrl);
  body.set("cancel_url", cancelUrl);
  body.set("client_reference_id", input.payment.id);
  body.set("metadata[paymentId]", input.payment.id);
  body.set("payment_intent_data[metadata][paymentId]", input.payment.id);
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", input.payment.currency.toLowerCase());
  body.set(
    "line_items[0][price_data][unit_amount]",
    String(toStripeMinorUnits(input.payment.amount, input.payment.currency))
  );
  body.set("line_items[0][price_data][product_data][name]", input.plan.name);
  body.set(
    "payment_method_types[0]",
    input.payment.method === PaymentMethod.ALIPAY ? "alipay" : "card"
  );

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const session = (await response.json().catch(() => null)) as { id?: string; url?: string } | null;

  if (!response.ok || !session?.url) {
    throw new CheckoutStartError("stripe_checkout_failed");
  }

  return session.url;
}

function createPaymentwallCheckout(input: { payment: Payment; plan: Plan; email: string }, pingbackFallback: string) {
  const projectKey = paymentwallProjectKey();
  const secret = paymentwallSecret();
  if (!projectKey || !secret) {
    throw new CheckoutStartError("paymentwall_not_configured");
  }

  const params: Record<string, string> = {
    key: projectKey,
    uid: input.payment.userId,
    widget: "p1_1",
    amount: String(input.payment.amount),
    currencyCode: input.payment.currency,
    ag_name: input.plan.name,
    ag_external_id: input.payment.id,
    ag_type: "fixed",
    email: input.email,
    pingback_url: `${publicAppUrl()}/api/v1/payments/webhook`,
    success_url: pingbackFallback,
    sign_version: "2",
  };
  const signed = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("");
  params.sign = md5Hex(`${signed}${secret}`);

  return `https://api.paymentwall.com/api/ps/?${new URLSearchParams(params).toString()}`;
}

function createPortoneCheckout(
  input: { payment: Payment; plan: Plan; email: string },
  redirectUrl: string
): PortOneCheckout {
  const storeId = portoneStoreId();
  const channelKey = portoneChannelKey();
  if (!storeId || !channelKey) {
    throw new CheckoutStartError("portone_not_configured");
  }

  return {
    storeId,
    channelKey,
    paymentId: input.payment.id,
    orderName: input.plan.name,
    totalAmount: input.payment.amount,
    currency: portoneCurrency(input.payment.currency),
    payMethod: input.payment.method === PaymentMethod.ALIPAY ? "ALIPAY" : "CARD",
    redirectUrl,
    locale: portoneLocale(input.payment.locale),
    customer: {
      email: input.email,
      fullName: portoneCustomerName(input.email),
    },
  };
}
