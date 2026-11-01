import { describe, expect, it } from "vitest";
import {
  checkoutOrderName,
  connectionPlanForFulfillment,
  DEFAULT_ESIM_PRODUCTS,
  parseEsimProductPatch,
  quoteEsimAddon,
} from "@/lib/esim/catalog";

const products = DEFAULT_ESIM_PRODUCTS.map((item) => ({ ...item }));
const week = { id: "global-week", priceKrw: 5900, priceUsd: 5, priceCny: 29, priceJpy: 680 };
const month = { id: "global-lite", priceKrw: 9900, priceUsd: 8, priceCny: 49, priceJpy: 1100 };
const year = { id: "global-year", priceKrw: 99000, priceUsd: 80, priceCny: 490, priceJpy: 11000 };

describe("quoteEsimAddon", () => {
  it("adds the data price to a week plan without changing the plan id", () => {
    const quote = quoteEsimAddon({
      locale: "ko",
      method: "card",
      product: "global",
      plan: week,
      esimProductId: "cn-5gb",
      enabled: true,
      products,
      ownsConnection: false,
    });

    expect(quote).toEqual({
      ok: true,
      planId: "global-week",
      esim: expect.objectContaining({ id: "cn-5gb", priceKrw: 19900, chargedAmount: 19900 }),
      amount: 25800,
      currency: "KRW",
    });
  });

  it("keeps a year charge on the connection price", () => {
    expect(
      quoteEsimAddon({
        locale: "ko",
        method: "card",
        product: "global",
        plan: year,
        esimProductId: "cn-5gb",
        enabled: true,
        products,
        ownsConnection: false,
      })
    ).toMatchObject({ ok: false, error: "esim_year" });

    expect(
      quoteEsimAddon({
        locale: "ko",
        method: "card",
        product: "global",
        plan: year,
        esimProductId: null,
        enabled: true,
        products,
        ownsConnection: false,
      })
    ).toEqual({ ok: true, planId: "global-year", esim: null, amount: null, currency: null });
  });

  it("lets a customer who already has a connection buy data again", () => {
    const quote = quoteEsimAddon({
      locale: "ko",
      method: "card",
      product: "global",
      plan: null,
      esimProductId: "cn-10gb",
      enabled: true,
      products,
      ownsConnection: true,
    });

    expect(quote).toMatchObject({
      ok: true,
      planId: null,
      amount: 29900,
      currency: "KRW",
    });
    expect(connectionPlanForFulfillment(quote.ok ? quote.planId : "global-lite")).toBe(
      quote.ok ? null : "unused"
    );
  });

  it("rejects a second connection while still allowing the data line to be omitted", () => {
    expect(
      quoteEsimAddon({
        locale: "ko",
        method: "card",
        product: "global",
        plan: month,
        esimProductId: null,
        enabled: true,
        products,
        ownsConnection: true,
      })
    ).toMatchObject({ ok: false, error: "already_owned" });
  });

  it("rejects new data sales while the switch is off and outside Korean card checkout", () => {
    expect(
      quoteEsimAddon({
        locale: "ko",
        method: "card",
        product: "global",
        plan: null,
        esimProductId: "cn-5gb",
        enabled: false,
        products,
        ownsConnection: false,
      })
    ).toMatchObject({ ok: false, error: "esim_disabled" });
  });

  it("charges each language in its own currency and stays closed at zero", () => {
    expect(
      quoteEsimAddon({
        locale: "en",
        method: "card",
        product: "global",
        plan: week,
        esimProductId: "cn-5gb",
        enabled: true,
        products,
        ownsConnection: false,
      })
    ).toMatchObject({ ok: true, amount: 20, currency: "USD" });

    expect(
      quoteEsimAddon({
        locale: "zh",
        method: "alipay",
        product: "global",
        plan: week,
        esimProductId: "cn-5gb",
        enabled: true,
        products,
        ownsConnection: false,
      })
    ).toMatchObject({ ok: true, amount: 128, currency: "CNY" });

    expect(
      quoteEsimAddon({
        locale: "en",
        method: "card",
        product: "global",
        plan: week,
        esimProductId: "cn-5gb",
        enabled: true,
        products: products.map((item) => ({ ...item, priceUsd: 0 })),
        ownsConnection: false,
      })
    ).toMatchObject({ ok: false, error: "esim_locale" });

    expect(
      quoteEsimAddon({
        locale: "zh",
        method: "alipay",
        product: "global",
        plan: week,
        esimProductId: null,
        enabled: true,
        products,
        ownsConnection: false,
      })
    ).toEqual({ ok: true, planId: "global-week", esim: null, amount: null, currency: null });
  });

  it("names a data charge separately from the connection service", () => {
    expect(
      checkoutOrderName({ serviceName: "AcrossFlare", planName: null, esimName: "중국 데이터 5GB" })
    ).toBe("중국 데이터 5GB");
    expect(
      checkoutOrderName({ serviceName: "AcrossFlare", planName: "Week", esimName: "중국 데이터 5GB" })
    ).toBe("Week · 중국 데이터 5GB");
    expect(checkoutOrderName({ serviceName: "AcrossFlare", planName: "Week", esimName: null })).toBe(
      "AcrossFlare Week"
    );
  });

  it("does not let an edit drop below the sold data size", () => {
    expect(parseEsimProductPatch(products[0], { dataGb: 3, days: 15 })).toBeNull();
    expect(parseEsimProductPatch(products[1], { dataGb: 15, priceKrw: 34900 })).toMatchObject({
      id: "cn-10gb",
      dataGb: 15,
      priceKrw: 34900,
    });
  });
});
