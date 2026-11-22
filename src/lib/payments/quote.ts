import { PaymentMethod, PaymentProvider, type Plan } from "@prisma/client";
import { routing, type AppLocale } from "@/i18n/routing";
import { settlementCurrency, usesLemonCheckout } from "@/lib/payments/settlement";

export function parseAppLocale(value: unknown): AppLocale | null {
  if (typeof value !== "string") {
    return null;
  }

  return routing.locales.includes(value as AppLocale) ? (value as AppLocale) : null;
}

export function parsePaymentMethod(value: unknown): PaymentMethod | null {
  if (value === "card" || value === PaymentMethod.CARD) {
    return PaymentMethod.CARD;
  }

  if (value === "alipay" || value === PaymentMethod.ALIPAY) {
    return PaymentMethod.ALIPAY;
  }

  return null;
}

export function defaultPaymentMethod(locale: AppLocale): PaymentMethod {
  return locale === "zh" ? PaymentMethod.ALIPAY : PaymentMethod.CARD;
}

export function checkoutProvider(locale: AppLocale, method: PaymentMethod) {
  return usesLemonCheckout(locale, method) ? PaymentProvider.LEMONSQUEEZY : PaymentProvider.PORTONE;
}

export function quotePayment(locale: AppLocale, method: PaymentMethod, plan: Plan) {
  const currency = settlementCurrency(locale, method);
  const amount = currency === "KRW" ? plan.priceKrw : plan.priceUsd;

  return {
    amount,
    currency,
    provider: checkoutProvider(locale, method),
  };
}

export function currencyForLocale(locale: AppLocale) {
  switch (locale) {
    case "ko":
      return "KRW";
    case "zh":
      return "CNY";
    case "ja":
      return "JPY";
    default:
      return "USD";
  }
}

export function toStripeMinorUnits(amount: number, currency: string) {
  return isZeroDecimalCurrency(currency) ? amount : amount * 100;
}

export function fromStripeMinorUnits(amount: number, currency: string) {
  return isZeroDecimalCurrency(currency) ? amount : Math.round(amount / 100);
}

function isZeroDecimalCurrency(currency: string) {
  return currency === "KRW" || currency === "JPY";
}
