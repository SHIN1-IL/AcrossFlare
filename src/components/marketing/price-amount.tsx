import {
  primaryAmountSlots,
  secondaryAmountSlots,
  splitPrimaryPrice,
  splitSecondaryPrice,
} from "@/lib/format-price";
import type { PlanPrices } from "@/lib/plans";
import type { AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const symbolClass = "mr-[0.08em] text-[0.68em] font-medium leading-none";
const slotClass = "inline-block w-[1ch] text-center";

export function PriceAmount({
  locale,
  prices,
  className,
  compact,
}: {
  locale: AppLocale;
  prices: PlanPrices;
  className?: string;
  compact?: boolean;
}) {
  const { symbol, amount } = splitPrimaryPrice(locale, prices);
  const slots = compact ? Array.from(amount) : primaryAmountSlots(locale, prices);

  return (
    <span className={cn("inline-flex items-baseline font-mono tabular-nums", className)}>
      <span className={symbolClass}>{symbol}</span>
      <AmountSlots slots={slots} />
    </span>
  );
}

export function SecondaryPriceAmount({
  locale,
  prices,
  className,
}: {
  locale: AppLocale;
  prices: PlanPrices;
  className?: string;
}) {
  const parts = splitSecondaryPrice(locale, prices);
  const slots = secondaryAmountSlots(prices);
  if (!parts || !slots) {
    return null;
  }

  return (
    <span className={cn("flex items-baseline font-mono tabular-nums", className)}>
      <span className={symbolClass}>{parts.symbol}</span>
      <AmountSlots slots={slots} />
    </span>
  );
}

function AmountSlots({ slots }: { slots: string[] }) {
  return (
    <span className="inline-flex">
      {slots.map((ch, index) => (
        <span key={`${index}-${ch}`} className={slotClass}>
          {ch === " " ? null : ch}
        </span>
      ))}
    </span>
  );
}
