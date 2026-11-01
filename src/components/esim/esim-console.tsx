"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { esimAmountForLocale } from "@/lib/esim/catalog";
import { currencyForLocale } from "@/lib/payments/quote";
import { formatMoney } from "@/lib/format-date";
import type { AppLocale } from "@/i18n/routing";

type Offer = {
  enabled: true;
  products: {
    id: string;
    name: string;
    dataGb: number;
    days: number;
    priceKrw: number;
    priceUsd: number;
    priceCny: number;
    priceJpy: number;
  }[];
  copy: {
    copyNoWifi: string;
    copyRefund: string;
    copyKorea: string;
    copyExit: string;
    copyYear: string;
  };
};

type Order = {
  id: string;
  name: string;
  priceKrw: number;
  currency: string;
  chargedAmount: number;
  status: string;
  qrText: string;
};

function productLabel(t: ReturnType<typeof useTranslations<"checkout">>, id: string) {
  return id === "cn-10gb" ? t("esimProducts.cn-10gb") : t("esimProducts.cn-5gb");
}

export function EsimConsole({ showBanner }: { showBanner: boolean }) {
  const t = useTranslations("app");
  const checkout = useTranslations("checkout");
  const locale = useLocale() as AppLocale;
  const [offer, setOffer] = useState<Offer | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/esim", { credentials: "include" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data: Offer | { enabled: false } | null) => {
        if (!cancelled && data && "products" in data && data.enabled) {
          setOffer(data);
        }
      });
    void fetch("/api/v1/esim/orders", { credentials: "include" })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data: { orders: Order[] } | null) => {
        if (!cancelled && data) {
          setOrders(data.orders);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const banner =
    showBanner && offer && offer.products.some((product) => esimAmountForLocale(product, locale) > 0)
      ? offer
      : null;
  if (!banner && orders.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
      {banner ? (
        <div className="space-y-2">
          <h2 className="text-sm font-medium">{t("esimBannerTitle")}</h2>
          <p className="text-xs leading-5 text-muted-foreground">
            {locale === "ko" ? banner.copy.copyExit : checkout("esimCopyExit")}
          </p>
          <div className="flex flex-wrap gap-2">
            {banner.products
              .filter((product) => esimAmountForLocale(product, locale) > 0)
              .map((product) => (
              <Link
                key={product.id}
                href={`/checkout?product=global&data=${product.id}`}
                className="rounded-[10px] border border-border px-3 py-2 text-sm"
              >
                {productLabel(checkout, product.id)} · {formatMoney(locale, esimAmountForLocale(product, locale), currencyForLocale(locale))}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      {orders.map((order) => (
        <article key={order.id} className="border-t border-border pt-3">
          <p className="text-sm">
            {order.name} · {formatMoney(locale, order.chargedAmount || order.priceKrw, order.currency || "KRW")}
          </p>
          {order.status === "READY" && order.qrText ? (
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs">{order.qrText}</pre>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">{t("esimOrderPending")}</p>
          )}
        </article>
      ))}
    </section>
  );
}

export function useEsimYearNote(active: boolean) {
  const checkout = useTranslations("checkout");
  const locale = useLocale() as AppLocale;
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }
    let cancelled = false;
    void fetch("/api/v1/esim")
      .then(async (response) => (response.ok ? response.json() : null))
      .then(
        (
          data: {
            enabled?: boolean;
            products?: Offer["products"];
            copy?: { copyYear?: string };
          } | null
        ) => {
          if (cancelled || !data?.enabled) {
            return;
          }
          const open = (data.products ?? []).some((product) => esimAmountForLocale(product, locale) > 0);
          if (!open) {
            return;
          }
          setNote(locale === "ko" ? data.copy?.copyYear ?? null : checkout("esimCopyYear"));
        }
      );
    return () => {
      cancelled = true;
    };
  }, [active, checkout, locale]);

  return note;
}
