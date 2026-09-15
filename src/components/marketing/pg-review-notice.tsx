"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { REVIEW_USER_EMAIL, REVIEW_USER_PASSWORD } from "@/lib/review-user";
import { cn } from "@/lib/utils";

type LoginHint = {
  reviewEmail: string;
  reviewPassword: string;
  ownerEmail: string;
  ownerPassword: string;
};

export function PgReviewNotice({ className }: { className?: string }) {
  const t = useTranslations("footer");
  const [hint, setHint] = useState<LoginHint>({
    reviewEmail: REVIEW_USER_EMAIL,
    reviewPassword: REVIEW_USER_PASSWORD,
    ownerEmail: "",
    ownerPassword: "",
  });

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/public/login-hint", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as LoginHint;
      })
      .then((next) => {
        if (!cancelled && next?.reviewEmail) {
          setHint(next);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={cn("space-y-1 text-xs leading-5 text-muted-foreground", className)}>
      <p>{t("trialNotice")}</p>
      <p className="font-medium text-foreground/80">{t("reviewAccountTitle")}</p>
      <p className="font-mono">
        {t("reviewAccount", { email: hint.reviewEmail, password: hint.reviewPassword })}
      </p>
      <p>{t("reviewAccountHint")}</p>
      {hint.ownerEmail && hint.ownerPassword ? (
        <>
          <p className="pt-2 font-medium text-foreground/80">{t("ownerAccountTitle")}</p>
          <p className="font-mono">
            {t("reviewAccount", { email: hint.ownerEmail, password: hint.ownerPassword })}
          </p>
          <p>{t("ownerAccountHint")}</p>
        </>
      ) : null}
    </div>
  );
}
