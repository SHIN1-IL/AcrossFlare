"use client";

import { useTranslations } from "next-intl";
import { BACKUP_SETUP_STEPS } from "@/lib/support-zone";

export function BackupSetupGuide() {
  const t = useTranslations("support");

  return (
    <div className="mt-5 space-y-5">
      <p className="text-sm text-muted-foreground">{t("backup.heading")}</p>
      <ol className="space-y-3">
        {BACKUP_SETUP_STEPS.map((step, index) => (
          <li
            key={step.id}
            className="flex items-start gap-4 rounded-xl border border-border bg-background/50 p-4 md:p-5"
          >
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-medium tracking-tight md:text-lg">
                {t(`backup.steps.${step.id}.title`)}
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {t(`backup.steps.${step.id}.body`)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
