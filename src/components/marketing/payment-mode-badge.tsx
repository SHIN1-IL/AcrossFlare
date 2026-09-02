import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PaymentModeBadge({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  const t = useTranslations("pricing");

  return (
    <Badge
      variant="outline"
      title={t("billingOneTimeCaption")}
      className={cn(
        "rounded-md border-border/80 bg-background/60 font-medium text-muted-foreground backdrop-blur-sm",
        compact ? "px-1.5 py-0 text-[9px] sm:text-[10px]" : "text-[10px] sm:text-xs",
        className
      )}
    >
      {t("billingOneTime")}
    </Badge>
  );
}
