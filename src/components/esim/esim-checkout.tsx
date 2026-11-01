"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { esimAmountForLocale, planAmountForLocale } from "@/lib/esim/catalog";
import { currencyForLocale } from "@/lib/payments/quote";
import { planTerm, type Plan } from "@/lib/plans";
import { formatMoney } from "@/lib/format-date";
import type { AppLocale } from "@/i18n/routing";

type Product = {
  id: string;
  name: string;
  dataGb: number;
  days: number;
  priceKrw: number;
  priceUsd: number;
  priceCny: number;
  priceJpy: number;
};
type Offer = {
  enabled: true;
  products: Product[];
  copy: {
    copyNoWifi: string;
    copyRefund: string;
    copyKorea: string;
    copyExit: string;
    copyYear: string;
  };
};

function productLabel(t: ReturnType<typeof useTranslations<"checkout">>, id: string) {
  return id === "cn-10gb" ? t("esimProducts.cn-10gb") : t("esimProducts.cn-5gb");
}

export type EsimCheckoutChoice = {
  ready: boolean;
  includeConnection: boolean;
  esimProductId: string | null;
  chargeAmount: number | null;
  currency: string;
};

export function EsimCheckout({
  plan,
  ownsConnection,
  initialDataId,
  onChange,
}: {
  plan: Plan | null;
  ownsConnection: boolean;
  initialDataId?: string;
  onChange: (choice: EsimCheckoutChoice) => void;
}) {
  const t = useTranslations("checkout");
  const locale = useLocale() as AppLocale;
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [connectionOn, setConnectionOn] = useState(!ownsConnection);
  const [dataOn, setDataOn] = useState(true);
  const [dataId, setDataId] = useState(initialDataId ?? "");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/esim", { credentials: "include" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data: Offer | { enabled: false } | null) => {
        if (cancelled) {
          return;
        }
        if (data && "products" in data && data.enabled) {
          setOffer(data);
          setDataId((current) => current || data.products[0]?.id || "");
        }
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const year = plan ? planTerm(plan.id) === "year" : false;
  const bundle = Boolean(plan) && !year && !ownsConnection && plan?.product !== "workspace";
  const dataOnly = !plan;
  const currency = currencyForLocale(locale);
  const priced = (offer?.products ?? []).filter((item) => esimAmountForLocale(item, locale) > 0);
  const showData = priced.length > 0 && (dataOnly || bundle);
  const selected = priced.find((item) => item.id === dataId) ?? priced[0] ?? null;
  const includeConnection = Boolean(plan) && (year || (!ownsConnection && connectionOn));
  const includeData = showData && (dataOnly || dataOn) && Boolean(selected);
  const chargeAmount =
    includeData && selected
      ? (includeConnection && plan
          ? planAmountForLocale(
              {
                priceKrw: plan.prices.krw,
                priceUsd: plan.prices.usd,
                priceCny: plan.prices.cny,
                priceJpy: plan.prices.jpy,
              },
              locale
            )
          : 0) + esimAmountForLocale(selected, locale)
      : null;
  const copy =
    locale === "ko" && offer
      ? offer.copy
      : {
          copyNoWifi: t("esimCopyNoWifi"),
          copyRefund: t("esimCopyRefund"),
          copyKorea: t("esimCopyKorea"),
          copyExit: t("esimCopyExit"),
          copyYear: t("esimCopyYear"),
        };

  useEffect(() => {
    onChange({
      ready: loaded,
      includeConnection,
      esimProductId: includeData && selected ? selected.id : null,
      chargeAmount,
      currency,
    });
  }, [chargeAmount, currency, includeConnection, includeData, loaded, onChange, selected]);

  if (!loaded || !offer) {
    return null;
  }

  if (year) {
    return <p className="mt-4 text-xs leading-5 text-muted-foreground">{copy.copyYear}</p>;
  }

  if (!showData || !selected) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3 text-left text-sm">
      <p className="text-xs leading-5 text-muted-foreground">{t("esimGuide")}</p>
      {plan && !ownsConnection ? (
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1 size-3.5 accent-primary"
            checked={connectionOn}
            onChange={(event) => setConnectionOn(event.target.checked)}
          />
          <span>
            {t("esimConnection")}
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">{copy.copyNoWifi}</span>
          </span>
        </label>
      ) : null}
      {dataOnly ? (
        <div className="space-y-2">
          {priced.map((product) => (
            <label key={product.id} className="flex items-center gap-2">
              <input
                type="radio"
                name="esim-data"
                className="size-3.5 accent-primary"
                checked={selected.id === product.id}
                onChange={() => setDataId(product.id)}
              />
              <span>
                {productLabel(t, product.id)} · {formatMoney(locale, esimAmountForLocale(product, locale), currency)} · {product.days}
                {t("esimDays")}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1 size-3.5 accent-primary"
            checked={dataOn}
            onChange={(event) => setDataOn(event.target.checked)}
          />
          <span className="min-w-0">
            {t("esimData")}
            <span className="mt-2 flex flex-col gap-1">
              {priced.map((product) => (
                <label key={product.id} className="flex items-center gap-2 text-xs">
                  <input
                    type="radio"
                    name="esim-data"
                    className="size-3.5 accent-primary"
                    disabled={!dataOn}
                    checked={selected.id === product.id}
                    onChange={() => setDataId(product.id)}
                  />
                  {productLabel(t, product.id)} · {formatMoney(locale, esimAmountForLocale(product, locale), currency)}
                </label>
              ))}
            </span>
          </span>
        </label>
      )}
      <p className="text-xs leading-5 text-muted-foreground">{copy.copyExit}</p>
      <p className="text-xs leading-5 text-muted-foreground">{copy.copyRefund}</p>
      <p className="text-xs leading-5 text-muted-foreground">{copy.copyKorea}</p>
    </div>
  );
}
