"use client";

import { useLocale, useTranslations } from "next-intl";
import { CopyField } from "@/components/app/copy-field";
import { IssuingSkeleton, ProductEmpty } from "@/components/app/product-empty";
import { StatusPill } from "@/components/app/status-pill";
import { UsageMeter } from "@/components/app/usage-meter";
import { buttonVariants } from "@/components/ui/button";
import { useAccount } from "@/hooks/use-account";
import { formatDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";

export function BackupDashboard() {
  const t = useTranslations("app");
  const locale = useLocale();
  const { account } = useAccount();

  if (!account) {
    return null;
  }

  if (!account.global) {
    return <ProductEmpty product="global" />;
  }

  if (account.global.status === "provisioning") {
    return <IssuingSkeleton />;
  }

  if (account.global.status === "unpaid" || account.global.status === "failed") {
    return (
      <ProductEmpty product="global" status={account.global.status} planId={account.global.planId} />
    );
  }

  const global = account.global;
  const statusLabel = global.failover ? t("statusFailover") : t("statusActive");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl tracking-tight">{t("backupTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("backupDesc")}</p>
        </div>
        <StatusPill label={statusLabel} tone={global.failover ? "warn" : "ok"} />
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <UsageMeter label={t("backupUsage")} used={global.backupUsedGb} limit={global.backupLimitGb} />
        <p className="mt-3 text-xs text-muted-foreground">{t("backupExpires", { date: formatDate(locale, global.expiresAt) })}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm">{t("vaultTitle")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("vaultDesc")}</p>
          <div className="mt-4 space-y-3">
            <CopyField label={t("vaultUrl")} value={global.vaultUrl} />
            <CopyField label={t("vaultUser")} value={global.vaultUser || account.email} />
          </div>
          <a
            href={global.vaultUrl || "https://vault.acrossflare.com"}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants(), "mt-4 rounded-[10px]")}
          >
            {t("openVault")}
          </a>
        </article>

        <article className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm">{t("syncthingTitle")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("syncthingDesc")}</p>
          <div className="mt-4 space-y-3">
            <CopyField label={t("syncthingUrl")} value={global.syncthingUrl} />
            <CopyField label={t("syncthingFolder")} value={global.syncthingFolderId} />
          </div>
          <a
            href={global.syncthingUrl || "https://sync.acrossflare.com"}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline" }), "mt-4 rounded-[10px]")}
          >
            {t("openSync")}
          </a>
        </article>
      </section>
    </div>
  );
}
