"use client";

import { useTranslations } from "next-intl";
import { REVIEW_USER_EMAIL, REVIEW_USER_PASSWORD } from "@/lib/review-user";
import { cn } from "@/lib/utils";

export function PgReviewNotice({ className }: { className?: string }) {
  const t = useTranslations("footer");

  return (
    <div className={cn("space-y-1 text-xs leading-5 text-muted-foreground", className)}>
      <p>{t("trialNotice")}</p>
      <p className="font-medium text-foreground/80">{t("reviewAccountTitle")}</p>
      <p className="font-mono">
        {t("reviewAccount", { email: REVIEW_USER_EMAIL, password: REVIEW_USER_PASSWORD })}
      </p>
      <p>{t("reviewAccountHint")}</p>
    </div>
  );
}
