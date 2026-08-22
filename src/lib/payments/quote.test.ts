import { PaymentMethod, PaymentProvider } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  currencyForLocale,
  defaultPaymentMethod,
  fromStripeMinorUnits,
  quotePayment,
  toStripeMinorUnits,
} from "@/lib/payments/quote";

const plan = {
  priceKrw: 19900,
  priceUsd: 15,
  priceCny: 99,
  priceJpy: 2300,
} as const;

describe("payments/quote", () => {
  it("uses Alipay for zh and card otherwise", () => {
    expect(defaultPaymentMethod("zh")).toBe(PaymentMethod.ALIPAY);
    expect(defaultPaymentMethod("ko")).toBe(PaymentMethod.CARD);
  });

  it("quotes the locale currency", () => {
    expect(currencyForLocale("ko")).toBe("KRW");
    expect(quotePayment("ko", PaymentMethod.CARD, plan as never)).toMatchObject({
      amount: 19900,
      currency: "KRW",
      provider: PaymentProvider.PORTONE,
    });
    expect(quotePayment("zh", PaymentMethod.ALIPAY, plan as never)).toMatchObject({
      amount: 99,
      currency: "CNY",
      provider: PaymentProvider.STRIPE,
    });
  });

  it("converts Stripe minor units", () => {
    expect(toStripeMinorUnits(15, "USD")).toBe(1500);
    expect(fromStripeMinorUnits(1500, "USD")).toBe(15);
    expect(toStripeMinorUnits(19900, "KRW")).toBe(19900);
  });
});
