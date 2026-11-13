"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState, type FormEvent } from "react";
import { DocumentLink } from "@/components/marketing/cached-marketing-link";
import { StageBackdrop } from "@/components/marketing/plan-stage-bg";
import { localePath } from "@/i18n/path";
import { checkoutReturnPath } from "@/lib/checkout-path";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriceAmount, SecondaryPriceAmount } from "@/components/marketing/price-amount";
import { PlanPeriodCaption } from "@/components/marketing/plan-period-caption";
import { readServiceLead, TypingLead } from "@/components/marketing/typing-lead";
import { esimAmountForLocale } from "@/lib/esim/catalog";
import { detailCardOffer, type AddonChoice, type AddonData } from "@/lib/esim/detail-offer";
import { currencyForLocale } from "@/lib/payments/quote";
import { formatMoney } from "@/lib/format-date";
import { getMarketingService, type MarketingServiceId } from "@/lib/marketing-services";
import {
  planHasPrice,
  planPricePeriodKey,
  planTerm,
  planTrafficQuota,
  type Plan,
  type PlanPrices,
} from "@/lib/plans";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@/i18n/routing";

type EsimProduct = {
  id: string;
  name: string;
  dataGb: number;
  days: number;
  priceKrw: number;
  priceUsd: number;
  priceCny: number;
  priceJpy: number;
};

type EsimOffer = {
  enabled: true;
  products: EsimProduct[];
  copy: {
    copyNoWifi: string;
    copyRefund: string;
    copyKorea: string;
    copyExit: string;
    copyYear: string;
  };
};

function toAddonData(product: EsimProduct): AddonData {
  return {
    id: product.id,
    days: product.days,
    prices: {
      krw: product.priceKrw,
      usd: product.priceUsd,
      cny: product.priceCny,
      jpy: product.priceJpy,
    },
  };
}

export function ServiceDetail({
  service: serviceId,
  plans,
  showAlipay,
}: {
  service: MarketingServiceId;
  plans: Plan[];
  showAlipay: boolean;
}) {
  const t = useTranslations("services");
  const tCompare = useTranslations("esimCompare");
  const tPricing = useTranslations("pricing");
  const locale = useLocale() as AppLocale;
  const service = getMarketingService(serviceId);
  const bundle = service.id === "standard" || service.id === "hybrid";
  const [offer, setOffer] = useState<EsimOffer | null>(null);
  const [networkOn, setNetworkOn] = useState(true);
  const [dataOn, setDataOn] = useState(false);
  const [dataId, setDataId] = useState("");
  const banners = plans.map((plan) => ({ key: plan.id, plan }));
  const lead =
    service.id === "standard" || service.id === "hybrid"
      ? readServiceLead(t.raw(`${service.id}.lead`))
      : null;
  const pricedData = (offer?.products ?? []).filter((product) => esimAmountForLocale(product, locale) > 0);
  const selectedData = pricedData.find((product) => product.id === dataId) ?? pricedData[0] ?? null;
  const choice: AddonChoice = {
    networkOn,
    dataOn: dataOn && Boolean(selectedData),
    data: selectedData ? toAddonData(selectedData) : null,
  };
  const yearNote =
    offer && pricedData.length > 0 ? (locale === "ko" ? offer.copy.copyYear : t("addonCopyYear")) : null;
  const copy =
    locale === "ko" && offer
      ? offer.copy
      : {
          copyRefund: t("addonCopyRefund"),
          copyKorea: t("addonCopyKorea"),
          copyExit: t("addonCopyExit"),
        };

  useEffect(() => {
    if (!bundle) {
      return;
    }
    let cancelled = false;
    void fetch("/api/v1/esim")
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data: EsimOffer | { enabled: false } | null) => {
        if (cancelled || !data || !("products" in data) || !data.enabled) {
          return;
        }
        setOffer(data);
        setDataId((current) => current || data.products[0]?.id || "");
      });
    return () => {
      cancelled = true;
    };
  }, [bundle]);

  return (
    <section className="relative min-h-dvh">
      <StageBackdrop variant={service.backdrop} />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-5xl flex-col items-center justify-end px-3 pt-24 pb-[12vh] text-center sm:px-6">
        {lead ? (
          <TypingLead lines={lead} />
        ) : (
          <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">
            {t(`${service.id}.eyebrow`)}
          </p>
        )}
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">
          {t(`${service.id}.title`)}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-balance text-sm leading-relaxed text-muted-foreground md:text-base">
          {t(`${service.id}.description`)}
        </p>
        {bundle && pricedData.length > 0 ? (
          <ServiceAddonPicker
            networkOn={networkOn}
            dataOn={dataOn}
            products={pricedData}
            selectedId={selectedData?.id ?? ""}
            locale={locale}
            dataTerm={!networkOn && dataOn ? t("addonDataTerm") : null}
            pick={!networkOn && !dataOn ? t("addonPick") : null}
            labels={{
              network: t("addonNetwork"),
              data: t("addonData"),
              days: (days) => tCompare("days", { days }),
            }}
            productLabel={(id) => (id === "cn-10gb" ? t("addonProduct10") : t("addonProduct5"))}
            onNetwork={setNetworkOn}
            onData={setDataOn}
            onDataId={setDataId}
          />
        ) : null}
        {dataOn ? (
          <EsimConditionBanner
            guide={t("addonGuide")}
            lines={[copy.copyExit, copy.copyRefund, copy.copyKorea]}
          />
        ) : null}
        {bundle && pricedData.length > 0 ? null : (
          <div className={cn("w-full", banners.length === 1 ? "mt-8 min-h-16 max-w-2xl" : "mt-6")} />
        )}
        <div className="mt-4 flex w-full justify-center">
          <div className={cn("w-full", banners.length > 1 && "max-w-5xl", banners.length === 1 && "max-w-sm")}>
            <div
              className={cn(
                "grid w-full gap-x-4 gap-y-3 sm:gap-4 md:gap-5",
                banners.length > 1 && "grid-cols-3"
              )}
            >
            {banners.map(({ key, plan }) => {
              const priced = planHasPrice(plan);
              const inquire = service.id === "workspace" && !priced;
              const card = bundle ? detailCardOffer(plan, choice) : null;
              const term = planTerm(plan.id);
              const yearLocked = bundle && dataOn && term === "year";
              const dataActive = bundle && dataOn && term !== "year";
              const sellingNetwork = card ? card.includeNetwork : priced;
              const quota = sellingNetwork ? planTrafficQuota(plan) : null;
              const displayPrices = card?.prices ?? plan.prices;
              return (
              <ServicePlanCard
                key={key}
                plan={plan}
                locale={locale}
                prices={displayPrices}
                showAlipay={showAlipay && (card ? Boolean(card.prices) : priced)}
                compactPrice
                hidePrice={card ? !card.prices : !priced}
                badge={planTerm(plan.id) === "week" ? t("trialPlan") : null}
                heading={
                  t.has(`${service.id}.headings.${plan.id}`)
                    ? t(`${service.id}.headings.${plan.id}`)
                    : null
                }
                inquire={inquire ? t("workspace.inquire") : null}
                quota={
                  quota
                    ? {
                        prefix:
                          quota.cadence === "month"
                            ? tPricing("quotaMonth")
                            : tPricing("quotaTotal"),
                        amount: `${quota.gb}GB`,
                      }
                    : null
                }
                features={t.raw(`${service.id}.features`)}
                cta={t(`${service.id}.cta`)}
                needsCode={service.id === "workspace"}
                checkoutHref={
                  yearLocked
                    ? null
                    : card
                      ? card.checkout
                        ? checkoutReturnPath(card.checkout)
                        : null
                      : checkoutReturnPath({ product: plan.product, plan: plan.id })
                }
                dataActive={dataActive}
                period={sellingNetwork ? tPricing(planPricePeriodKey(plan.id, service.id)) : null}
                showPeriodCaption={sellingNetwork}
                dataCaption={card?.includeData && !card.includeNetwork && selectedData ? tCompare("days", { days: selectedData.days }) : null}
                breakdown={
                  card?.breakdown
                    ? {
                        networkLabel: t("addonLineNetwork"),
                        dataLabel: t("addonLineData"),
                        network: card.breakdown.network,
                        data: card.breakdown.data,
                      }
                    : null
                }
                yearNote={planTerm(plan.id) === "year" ? yearNote : null}
              />
              );
            })}
            </div>
          </div>
        </div>
        <p className="mx-auto mt-4 max-w-xl text-balance text-xs leading-relaxed text-muted-foreground">
          {t("availabilityNote")}
        </p>
      </div>
    </section>
  );
}

function ServicePlanCard({
  plan,
  locale,
  prices,
  showAlipay,
  compactPrice,
  hidePrice,
  badge,
  heading,
  inquire,
  quota,
  features,
  cta,
  needsCode,
  checkoutHref,
  period,
  showPeriodCaption,
  dataCaption,
  breakdown,
  yearNote,
  dataActive,
}: {
  plan: Plan;
  locale: AppLocale;
  prices: PlanPrices;
  showAlipay: boolean;
  compactPrice?: boolean;
  hidePrice?: boolean;
  badge?: string | null;
  heading?: string | null;
  inquire?: string | null;
  quota?: { prefix: string; amount: string } | null;
  features?: string[] | null;
  cta: string;
  needsCode?: boolean;
  checkoutHref: string | null;
  period: string | null;
  showPeriodCaption?: boolean;
  dataCaption?: string | null;
  breakdown?: { networkLabel: string; dataLabel: string; network: PlanPrices; data: PlanPrices } | null;
  yearNote?: string | null;
  dataActive?: boolean;
}) {
  const tPricing = useTranslations("pricing");
  const items = Array.isArray(features) ? features : [];
  const buttonClass = cn(
    buttonVariants({ size: compactPrice ? "default" : "lg" }),
    "flex h-auto min-h-8 w-full min-w-0 max-w-full items-center justify-center whitespace-normal rounded-[10px] px-1.5 py-1.5 text-center text-[11px] leading-snug sm:px-2 sm:text-sm",
    compactPrice && "text-[11px] sm:text-sm"
  );

  return (
    <article
      className={cn(
        "relative flex min-w-0 flex-col items-center overflow-hidden rounded-2xl border border-border bg-card/80 px-2 py-4 text-center backdrop-blur-sm sm:px-3 sm:py-5",
        dataActive && "border-emerald-400/55 bg-emerald-400/[0.09]",
        badge && "pt-6 sm:pt-7"
      )}
    >
      {badge ? (
        <p className="absolute top-1.5 right-1 left-1 text-[9px] font-medium leading-tight tracking-wide text-orange-400 sm:top-2 sm:text-[11px]">
          {badge}
        </p>
      ) : null}
      {heading ? (
        <p className="w-full min-w-0 break-words text-center text-[11px] font-medium leading-snug sm:text-sm md:text-base">
          {heading}
        </p>
      ) : null}
      <div className={cn("flex w-full items-center justify-center", heading && "mt-3")}>
        <div className="w-full">
          <PriceLine
            locale={locale}
            prices={prices}
            period={period}
            compact={compactPrice}
            quota={quota}
            hidePrice={hidePrice}
            inquire={inquire}
            showPeriodCaption={showPeriodCaption}
            dataCaption={dataCaption}
            breakdown={breakdown}
          />
        </div>
      </div>
      {showAlipay ? <p className="mt-2 text-xs text-primary">{tPricing("alipay")}</p> : null}
      {yearNote ? <p className="mt-2 text-[10px] leading-snug text-muted-foreground sm:text-xs">{yearNote}</p> : null}
      {items.length ? (
        <ul className="mt-4 w-full min-w-0 flex-1 space-y-2 text-left text-[10px] leading-snug text-muted-foreground sm:text-xs">
          {items.map((item) => (
            <li key={item} className="flex min-w-0 gap-1.5">
              <span className="mt-[0.45em] size-1 shrink-0 rounded-full bg-primary/75" />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={cn("w-full", items.length ? "mt-auto pt-6" : "mt-6")}>
        {needsCode ? (
          <PromoCta planId={plan.id} product={plan.product} cta={cta} buttonClass={buttonClass} />
        ) : checkoutHref ? (
          <DocumentLink href={checkoutHref} className={buttonClass}>
            {cta}
          </DocumentLink>
        ) : (
          <button type="button" className={buttonClass} disabled>
            {cta}
          </button>
        )}
      </div>
    </article>
  );
}

function PromoCta({
  planId,
  product,
  cta,
  buttonClass,
}: {
  planId: string;
  product: string;
  cta: string;
  buttonClass: string;
}) {
  const t = useTranslations("services");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/v1/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, planId }),
      });
      const data = (await response.json()) as { code?: string; planId?: string };
      if (!response.ok || !data.code || data.planId !== planId) {
        setError(true);
        return;
      }

      window.location.assign(
        localePath(
          locale,
          checkoutReturnPath({ product, plan: planId, promoCode: data.code })
        )
      );
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className={buttonClass} onClick={() => setOpen(true)}>
        {cta}
      </button>
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-2">
      <Input
        value={code}
        onChange={(event) => {
          setCode(event.target.value);
          setError(false);
        }}
        placeholder={t("workspace.codePlaceholder")}
        autoFocus
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={error}
        className="h-8 rounded-[10px] text-center font-mono uppercase"
      />
      <button type="submit" className={buttonClass} disabled={pending}>
        {t("workspace.codeSubmit")}
      </button>
      {error ? <p className="text-xs text-destructive">{t("workspace.codeInvalid")}</p> : null}
    </form>
  );
}

function PriceLine({
  locale,
  prices,
  period,
  compact,
  quota,
  hidePrice,
  inquire,
  showPeriodCaption,
  dataCaption,
  breakdown,
}: {
  locale: AppLocale;
  prices: Plan["prices"];
  period: string | null;
  compact?: boolean;
  quota?: { prefix: string; amount: string } | null;
  hidePrice?: boolean;
  inquire?: string | null;
  showPeriodCaption?: boolean;
  dataCaption?: string | null;
  breakdown?: { networkLabel: string; dataLabel: string; network: PlanPrices; data: PlanPrices } | null;
}) {
  if (inquire) {
    return (
      <p className="max-w-full break-words text-center text-xs font-medium leading-snug text-muted-foreground sm:text-sm md:text-base">
        {inquire}
      </p>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col items-center gap-0.5 font-mono tracking-tight sm:gap-1",
        compact ? "text-[13px] sm:text-lg md:text-xl" : "text-2xl md:text-3xl"
      )}
    >
      {hidePrice ? null : (
        <>
          <p className="max-w-full leading-none">
            <PriceAmount
              locale={locale}
              prices={prices}
              compact={compact}
              className="max-w-full text-primary"
            />
          </p>
          <SecondaryPriceAmount
            locale={locale}
            prices={prices}
            className="justify-center text-[10px] text-muted-foreground sm:text-xs"
          />
          {breakdown ? (
            <div className="mt-1 space-y-0.5 text-[10px] font-normal tracking-normal text-muted-foreground sm:text-xs">
              <p className="flex items-baseline justify-center gap-1">
                <span>{breakdown.networkLabel}</span>
                <PriceAmount locale={locale} prices={breakdown.network} compact className="text-foreground" />
              </p>
              <p className="flex items-baseline justify-center gap-1">
                <span>{breakdown.dataLabel}</span>
                <PriceAmount locale={locale} prices={breakdown.data} compact className="text-foreground" />
              </p>
            </div>
          ) : null}
        </>
      )}
      {dataCaption ? (
        <p className="max-w-full text-[10px] font-medium leading-none text-muted-foreground sm:text-xs">{dataCaption}</p>
      ) : null}
      {period && showPeriodCaption ? (
        <PlanPeriodCaption period={period} compact={compact} className="max-w-full text-center" />
      ) : period ? (
        <p className="max-w-full text-[10px] font-medium leading-none text-muted-foreground sm:text-xs md:text-sm">
          {period}
        </p>
      ) : null}
      {hidePrice || !quota ? null : (
        <p className="max-w-full text-center text-[11px] font-semibold leading-none text-blue-400 sm:text-sm md:text-base">
          {quota.prefix} {quota.amount}
        </p>
      )}
    </div>
  );
}

function readableLines(value: string) {
  const trimmed = value.trim();
  const parts = trimmed.includes("\n") ? trimmed.split(/\n+/) : trimmed.split(/(?<=[.。])\s+/);
  return parts.map((line) => line.trim()).filter(Boolean);
}

function EsimConditionBanner({ guide, lines }: { guide: string; lines: string[] }) {
  const lead = readableLines(guide);
  const notes = lines.flatMap(readableLines);
  if (!lead.length && !notes.length) {
    return null;
  }

  return (
    <div className="mt-4 grid w-full gap-3 rounded-2xl border border-[#071a24] bg-[#071a24] px-4 py-3 text-left text-xs leading-6 text-muted-foreground sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] sm:gap-8 sm:px-5">
      {lead.length ? (
        <div className="space-y-1">
          {lead.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}
      {notes.length ? (
        <ul className="space-y-1">
          {notes.map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden className="mt-[0.55em] size-1 shrink-0 rounded-full bg-primary/70" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ServiceAddonPicker({
  networkOn,
  dataOn,
  products,
  selectedId,
  locale,
  dataTerm,
  pick,
  labels,
  productLabel,
  onNetwork,
  onData,
  onDataId,
}: {
  networkOn: boolean;
  dataOn: boolean;
  products: EsimProduct[];
  selectedId: string;
  locale: AppLocale;
  dataTerm: string | null;
  pick: string | null;
  labels: { network: string; data: string; days: (days: number) => string };
  productLabel: (id: string) => string;
  onNetwork: (on: boolean) => void;
  onData: (on: boolean) => void;
  onDataId: (id: string) => void;
}) {
  const currency = currencyForLocale(locale);

  return (
    <div className="mx-auto mt-6 w-full max-w-md space-y-3 text-left text-sm">
      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-1 size-3.5 accent-primary"
          checked={networkOn}
          onChange={(event) => onNetwork(event.target.checked)}
        />
        <span>{labels.network}</span>
      </label>
      <div>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-1 size-3.5 accent-primary"
            checked={dataOn}
            onChange={(event) => onData(event.target.checked)}
          />
          <span>{labels.data}</span>
        </label>
        {dataOn ? (
          <div className="mt-2 ml-6 flex flex-col gap-1">
            {products.map((product) => (
              <label key={product.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="radio"
                  name="service-esim-data"
                  className="size-3.5 accent-primary"
                  checked={selectedId === product.id}
                  onChange={() => onDataId(product.id)}
                />
                {productLabel(product.id)} · {formatMoney(locale, esimAmountForLocale(product, locale), currency)} ·{" "}
                {labels.days(product.days)}
              </label>
            ))}
          </div>
        ) : null}
      </div>
      {dataTerm ? <p className="text-xs leading-5 text-muted-foreground">{dataTerm}</p> : null}
      {pick ? <p className="text-xs leading-5 text-muted-foreground">{pick}</p> : null}
    </div>
  );
}
