"use client";

import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/marketing/locale-switcher";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/hooks/use-account";
import { SCENARIO_ACCOUNTS } from "@/lib/account";
import { getPreviewEmail, setPreviewEmail } from "@/lib/session";
import { cn } from "@/lib/utils";

export function SettingsView() {
  const t = useTranslations("app");
  const { session } = useAccount();

  if (!session) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-3xl tracking-tight">{t("settingsTitle")}</h1>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs text-muted-foreground">{t("settingsAccount")}</p>
        <p className="mt-2 font-mono text-sm">{session.email}</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-xs text-muted-foreground">{t("language")}</p>
        <div className="mt-3">
          <LocaleSwitcher />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm">{t("settingsScenario")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("settingsScenarioHint")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {SCENARIO_ACCOUNTS.map((item) => {
            const preview = getPreviewEmail();
            const active = (preview ?? session.email) === item.email;
            return (
              <Button
                key={item.id}
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                className={cn("rounded-[10px] font-mono")}
                onClick={() => setPreviewEmail(item.email)}
              >
                {item.id}
              </Button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
