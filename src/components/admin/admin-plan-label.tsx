"use client";

import { useTranslations } from "next-intl";
import { isLegacyPlanId } from "@/lib/admin-service";
import { isWeeklyPlan } from "@/lib/plans";
import { cn } from "@/lib/utils";

const PLAN_NAME_KEYS = {
  "global-week": "planNames.global-week",
  "global-lite": "planNames.global-lite",
  "global-year": "planNames.global-year",
  "hybrid-week": "planNames.hybrid-week",
  "hybrid-lite": "planNames.hybrid-lite",
  "hybrid-year": "planNames.hybrid-year",
} as const;

export function useAdminPlanHeading(planId: string, fallback: string) {
  const t = useTranslations("admin");
  const tServices = useTranslations("services");
  if (planId === "workspace-a" || planId === "workspace-b" || planId === "workspace-c") {
    return tServices(`workspace.headings.${planId}`);
  }
  const nameKey = PLAN_NAME_KEYS[planId as keyof typeof PLAN_NAME_KEYS];
  if (nameKey) {
    return t(nameKey);
  }
  return fallback;
}

export function AdminPlanLabel({
  planId,
  fallback,
  className,
}: {
  planId: string;
  fallback: string;
  className?: string;
}) {
  const t = useTranslations("admin");
  const tServices = useTranslations("services");
  const heading = useAdminPlanHeading(planId, fallback);
  const trial = isWeeklyPlan(planId);
  const legacy = isLegacyPlanId(planId);

  return (
    <span className={cn("inline-flex flex-col items-start gap-0.5", className)}>
      {trial ? <span className="text-[10px] text-orange-400">{tServices("trialPlan")}</span> : null}
      <span>{heading}</span>
      {legacy ? <span className="text-[10px] text-muted-foreground">{t("legacyPlan")}</span> : null}
    </span>
  );
}

export function AdminPlanOption({ planId, fallback }: { planId: string; fallback: string }) {
  const heading = useAdminPlanHeading(planId, fallback);
  return <option value={planId}>{heading}</option>;
}
