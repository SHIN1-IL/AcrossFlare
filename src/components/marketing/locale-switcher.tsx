"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { routing, type AppLocale } from "@/i18n/routing";
import { usePathname, useRouter } from "@/i18n/navigation";

const LOCALE_LABEL: Record<AppLocale, string> = {
  en: "EN",
  ko: "KO",
  zh: "ZH",
  ja: "JA",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-0.5 rounded-[10px] border border-border bg-surface px-1 py-0.5">
      {routing.locales.map((code) => {
        const active = code === locale;

        return (
          <button
            key={code}
            type="button"
            disabled={pending || active}
            aria-label={code}
            aria-current={active ? "true" : undefined}
            onClick={() => {
              startTransition(() => {
                const params = Object.fromEntries(new URLSearchParams(window.location.search));
                router.replace(
                  Object.keys(params).length > 0 ? { pathname, query: params } : pathname,
                  { locale: code }
                );
              });
            }}
            className={`h-7 rounded-md px-2 font-mono text-[11px] tracking-wide transition-colors ${
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {LOCALE_LABEL[code]}
          </button>
        );
      })}
    </div>
  );
}
