import type { AppLocale } from "@/i18n/routing";
import { currencyForLocale } from "@/lib/payments/quote";
import { planTerm, type PublicCheckoutProduct } from "@/lib/plans";

export const ESIM_SETTINGS_ID = "default";

export const DEFAULT_ESIM_PRODUCTS = [
  {
    id: "cn-5gb",
    name: "중국 데이터 5GB",
    dataGb: 5,
    days: 30,
    priceKrw: 19900,
    priceUsd: 15,
    priceCny: 99,
    priceJpy: 2300,
    sort: 0,
  },
  {
    id: "cn-10gb",
    name: "중국 데이터 10GB",
    dataGb: 10,
    days: 30,
    priceKrw: 29900,
    priceUsd: 22,
    priceCny: 149,
    priceJpy: 3400,
    sort: 1,
  },
] as const;

export const DEFAULT_ESIM_COPY = {
  copyNoWifi: "와이파이가 없는 환경에서는 데이터, 호텔에서는 와이파이에 연결.",
  copyRefund: "설치 전에는 취소할 수 있고, 설치 후에는 환불되지 않습니다.",
  copyKorea: "대한민국 안에서는 데이터 통신이 되지 않으며, 중국 현지 통신망에 접속할 때만 사용할 수 있습니다.",
  copyExit: "홍콩이 아닌 해외 출구.",
  copyYear: "데이터는 포함되지 않습니다. 구독 후 매달 따로 살 수 있습니다.",
} as const;

export const ESIM_GUIDE =
  "7일 이하는 주간 세트, 2주에서 1개월은 월간 세트입니다. 지도와 메신저는 5GB, 노트북을 테더링하면 10GB입니다.";

export type EsimProductInput = {
  id: string;
  name: string;
  dataGb: number;
  days: number;
  priceKrw: number;
  priceUsd: number;
  priceCny: number;
  priceJpy: number;
};

export type EsimChargeCurrency = "KRW" | "USD" | "CNY" | "JPY";

export type EsimQuoteError =
  | "empty"
  | "esim_disabled"
  | "esim_locale"
  | "esim_method"
  | "esim_year"
  | "esim_workspace"
  | "invalid_esim"
  | "already_owned";

export type EsimQuote =
  | {
      ok: true;
      planId: string | null;
      esim: (EsimProductInput & { chargedAmount: number }) | null;
      amount: number | null;
      currency: EsimChargeCurrency | null;
    }
  | { ok: false; error: EsimQuoteError };

const MIN_DATA_GB: Record<string, number> = {
  "cn-5gb": 5,
  "cn-10gb": 10,
};

/** Connection fulfillment runs only when the charge includes a connection plan. */
export function connectionPlanForFulfillment(planId: string | null | undefined) {
  const id = planId?.trim() ?? "";
  return id || null;
}

export function checkoutOrderName(input: {
  serviceName: string;
  planName: string | null;
  esimName: string | null;
}) {
  const planName = input.planName?.trim() ?? "";
  const esimName = input.esimName?.trim() ?? "";
  if (esimName && planName) {
    return `${planName} · ${esimName}`.slice(0, 40);
  }
  if (esimName) {
    return esimName.slice(0, 40);
  }
  return `${input.serviceName} ${planName}`.trim().slice(0, 40);
}

export function esimAmountForLocale(product: EsimProductInput, locale: AppLocale) {
  const currency = currencyForLocale(locale);
  if (currency === "KRW") return product.priceKrw;
  if (currency === "CNY") return product.priceCny;
  if (currency === "JPY") return product.priceJpy;
  return product.priceUsd;
}

export function planAmountForLocale(
  plan: { priceKrw: number; priceUsd: number; priceCny: number; priceJpy: number },
  locale: AppLocale
) {
  const currency = currencyForLocale(locale);
  if (currency === "KRW") return plan.priceKrw;
  if (currency === "CNY") return plan.priceCny;
  if (currency === "JPY") return plan.priceJpy;
  return plan.priceUsd;
}

export function quoteEsimAddon(input: {
  locale: AppLocale;
  method: "card" | "alipay";
  product: PublicCheckoutProduct | null;
  plan: { id: string; priceKrw: number; priceUsd: number; priceCny: number; priceJpy: number } | null;
  esimProductId: string | null;
  enabled: boolean;
  products: EsimProductInput[];
  ownsConnection: boolean;
}): EsimQuote {
  const esimId = input.esimProductId?.trim() || null;
  const plan = input.plan;

  if (!plan && !esimId) {
    return { ok: false, error: "empty" };
  }

  if (plan && input.ownsConnection) {
    return { ok: false, error: "already_owned" };
  }

  let esim: (EsimProductInput & { chargedAmount: number }) | null = null;
  if (esimId) {
    if (!input.enabled) {
      return { ok: false, error: "esim_disabled" };
    }
    if (input.product === "workspace") {
      return { ok: false, error: "esim_workspace" };
    }
    if (plan && planTerm(plan.id) === "year") {
      return { ok: false, error: "esim_year" };
    }
    const found = input.products.find((item) => item.id === esimId);
    const chargedAmount = found ? esimAmountForLocale(found, input.locale) : 0;
    if (!found || chargedAmount <= 0 || found.dataGb <= 0 || found.days <= 0) {
      return { ok: false, error: found ? "esim_locale" : "invalid_esim" };
    }
    esim = {
      id: found.id,
      name: found.name,
      dataGb: found.dataGb,
      days: found.days,
      priceKrw: found.priceKrw,
      priceUsd: found.priceUsd,
      priceCny: found.priceCny,
      priceJpy: found.priceJpy,
      chargedAmount,
    };
  }

  const currency = currencyForLocale(input.locale);
  return {
    ok: true,
    planId: plan?.id ?? null,
    esim,
    amount: esim ? (plan ? planAmountForLocale(plan, input.locale) : 0) + esim.chargedAmount : null,
    currency: esim ? currency : null,
  };
}

export function parseEsimProductPatch(
  current: EsimProductInput,
  patch: {
    name?: unknown;
    dataGb?: unknown;
    days?: unknown;
    priceKrw?: unknown;
    priceUsd?: unknown;
    priceCny?: unknown;
    priceJpy?: unknown;
  }
): EsimProductInput | null {
  const name = typeof patch.name === "string" ? patch.name.trim() : current.name;
  const dataGb = numberOr(patch.dataGb, current.dataGb);
  const days = numberOr(patch.days, current.days);
  const priceKrw = numberOr(patch.priceKrw, current.priceKrw);
  const priceUsd = numberOr(patch.priceUsd, current.priceUsd);
  const priceCny = numberOr(patch.priceCny, current.priceCny);
  const priceJpy = numberOr(patch.priceJpy, current.priceJpy);
  const floor = MIN_DATA_GB[current.id] ?? 1;
  if (!name || name.length > 40) {
    return null;
  }
  if (!Number.isInteger(dataGb) || dataGb < floor || dataGb > 100) {
    return null;
  }
  if (!Number.isInteger(days) || days < 30 || days > 365) {
    return null;
  }
  if (!Number.isInteger(priceKrw) || priceKrw < 1000 || priceKrw > 500000) {
    return null;
  }
  if (!Number.isInteger(priceUsd) || priceUsd < 0 || priceUsd > 500) {
    return null;
  }
  if (!Number.isInteger(priceCny) || priceCny < 0 || priceCny > 2000) {
    return null;
  }
  if (!Number.isInteger(priceJpy) || priceJpy < 0 || priceJpy > 50000) {
    return null;
  }
  return { id: current.id, name, dataGb, days, priceKrw, priceUsd, priceCny, priceJpy };
}

export function parseEsimCopy(patch: {
  copyNoWifi?: unknown;
  copyRefund?: unknown;
  copyKorea?: unknown;
  copyExit?: unknown;
  copyYear?: unknown;
}) {
  const next = {
    copyNoWifi: sentence(patch.copyNoWifi),
    copyRefund: sentence(patch.copyRefund),
    copyKorea: sentence(patch.copyKorea),
    copyExit: sentence(patch.copyExit),
    copyYear: sentence(patch.copyYear),
  };
  if (Object.values(next).some((value) => !value)) {
    return null;
  }
  return next as {
    copyNoWifi: string;
    copyRefund: string;
    copyKorea: string;
    copyExit: string;
    copyYear: string;
  };
}

function sentence(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }
  const text = value.trim();
  if (!text || text.length > 400) {
    return null;
  }
  return text;
}

function numberOr(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}
