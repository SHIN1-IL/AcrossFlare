import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function PlanPeriodCaption({
  period,
  className,
  compact,
}: {
  period: string;
  className?: string;
  compact?: boolean;
}) {
  const t = useTranslations("pricing");

  return (
    <p
      className={cn(
        "text-muted-foreground",
        compact ? "text-[10px] leading-snug sm:text-xs" : "text-xs leading-5",
        className
      )}
    >
      {t("periodOneTimeLine", { period, billing: t("billingOneTime") })}
    </p>
  );
}
