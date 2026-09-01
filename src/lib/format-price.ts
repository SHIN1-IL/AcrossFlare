import type { AppLocale } from "@/i18n/routing";
import { plans, type PlanPrices } from "@/lib/plans";

type PriceParts = { symbol: string; amount: string };

export function splitPrimaryPrice(locale: AppLocale, prices: PlanPrices): PriceParts {
  switch (locale) {
    case "ko":
      return { symbol: "₩", amount: prices.krw.toLocaleString("ko-KR") };
    case "zh":
      return { symbol: "¥", amount: prices.cny.toLocaleString("zh-CN") };
    case "ja":
      return { symbol: "¥", amount: prices.jpy.toLocaleString("ja-JP") };
    default:
      return { symbol: "$", amount: prices.usd.toLocaleString("en-US") };
  }
}

export function formatPrimaryPrice(locale: AppLocale, prices: PlanPrices) {
  const { symbol, amount } = splitPrimaryPrice(locale, prices);
  return `${symbol}${amount}`;
}

export function splitSecondaryPrice(_locale: AppLocale, _prices: PlanPrices): PriceParts | null {
  return null;
}

export function formatSecondaryPrice(locale: AppLocale, prices: PlanPrices) {
  const parts = splitSecondaryPrice(locale, prices);
  return parts ? `${parts.symbol}${parts.amount}` : null;
}

export function primaryAmountSlots(locale: AppLocale, prices: PlanPrices) {
  const { amount } = splitPrimaryPrice(locale, prices);
  return amountCharSlots(amount, locale);
}

export function secondaryAmountSlots(prices: PlanPrices) {
  const parts = splitSecondaryPrice("zh", prices);
  if (!parts) {
    return null;
  }

  return amountCharSlots(parts.amount, "en");
}

export function amountCharSlots(amount: string, locale: AppLocale) {
  const width = Math.max(
    1,
    amount.length,
    ...plans.map((plan) => splitPrimaryPrice(locale, plan.prices).amount.length)
  );
  return Array.from(amount.padStart(width, " "));
}
