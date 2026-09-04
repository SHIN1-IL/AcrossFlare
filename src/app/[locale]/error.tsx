"use client";

import { useTranslations } from "next-intl";

export default function LocaleError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center text-foreground">
      <div className="space-y-2">
        <h1 className="text-2xl tracking-tight">{t("title")}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{t("body")}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t("retry")}
        </button>
        <button
          type="button"
          onClick={() => window.location.assign(window.location.href)}
          className="rounded-[10px] border border-border bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:bg-surface-2"
        >
          {t("reload")}
        </button>
      </div>
    </div>
  );
}
