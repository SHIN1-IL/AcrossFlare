"use client";

import { Download } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { CopyField } from "@/components/app/copy-field";
import { IssuingSkeleton, ProductEmpty } from "@/components/app/product-empty";
import { QrPanel } from "@/components/app/qr-panel";
import { StatusPill } from "@/components/app/status-pill";
import { UsageMeter } from "@/components/app/usage-meter";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/hooks/use-account";
import { Link } from "@/i18n/navigation";
import { downloadText } from "@/lib/download";
import { formatDate } from "@/lib/format-date";

export function GlobalDashboard() {
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
          <h1 className="text-3xl tracking-tight">{t("globalTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("globalDesc")}</p>
        </div>
        <StatusPill label={statusLabel} tone={global.failover ? "warn" : "ok"} />
      </div>

      {global.failover ? (
        <div className="rounded-[10px] border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          {t("failoverBanner")}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <MetaCard label={t("plan")} value={global.planName} />
        <MetaCard label={t("expires")} value={formatDate(locale, global.expiresAt)} />
        <MetaCard label={t("nodes")} value={global.nodes.join(" · ")} mono />
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <UsageMeter
          label={global.failover ? t("usageUnlimited") : t("usageTraffic")}
          used={global.trafficUsedGb}
          limit={global.trafficLimitGb}
          unlimited={global.failover}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm">{t("karing")}</p>
          <div className="mt-4">
            <QrPanel value={global.deepLink} label={t("karingQr")} />
          </div>
        </div>
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <CopyField label={t("deepLink")} value={global.deepLink} />
          <CopyField label={t("yamlUrl")} value={global.yamlUrl} />
          <Button
            type="button"
            variant="outline"
            className="rounded-[10px]"
            onClick={() => downloadText("acrossflare.yaml", global.yamlBody, "text/yaml")}
          >
            <Download />
            {t("yamlDownload")}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm">{t("backup")}</p>
        <div className="mt-4 space-y-4">
          <UsageMeter
            label={t("backupUsage")}
            used={global.backupUsedGb}
            limit={global.backupLimitGb}
          />
          <CopyField label={t("vaultUrl")} value={global.vaultUrl} />
          <CopyField label={t("syncthingUrl")} value={global.syncthingUrl} />
          <CopyField label={t("syncthingFolder")} value={global.syncthingFolderId} />
          <Link
            href="/dashboard"
            className="inline-flex text-sm text-primary transition-colors hover:text-primary/80"
          >
            {t("openBackupPwa")}
          </Link>
        </div>
      </section>
    </div>
  );
}

function MetaCard({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-2 text-sm ${mono ? "font-mono text-xs break-all" : ""}`}>{value}</p>
    </div>
  );
}
