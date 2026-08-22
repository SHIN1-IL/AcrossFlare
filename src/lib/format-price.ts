import type { AppLocale } from "@/i18n/routing";
import type { PlanPrices } from "@/lib/plans";

export function formatPrimaryPrice(locale: AppLocale, prices: PlanPrices) {
  switch (locale) {
    case "ko":
      return `₩${prices.krw.toLocaleString("ko-KR")}`;
    case "zh":
      return `¥${prices.cny.toLocaleString("zh-CN")}`;
    case "ja":
      return `¥${prices.jpy.toLocaleString("ja-JP")}`;
    default:
      return `$${prices.usd.toLocaleString("en-US")}`;
  }
}

export function formatSecondaryPrice(locale: AppLocale, prices: PlanPrices) {
  if (locale !== "zh") {
    return null;
  }

  return `$${prices.usd.toLocaleString("en-US")}`;
}
