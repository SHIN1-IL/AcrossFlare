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
import { downloadFromUrl } from "@/lib/download";
import { formatDate } from "@/lib/format-date";
import { publicServiceFromPlanId } from "@/lib/public-service";
import { SUPPORT_HREF } from "@/lib/support-zone";

export function GlobalDashboard({ product = "global" }: { product?: "global" | "workspace" }) {
  const t = useTranslations("app");
  const locale = useLocale();
  const { account } = useAccount();

  if (!account) {
    return null;
  }

  const lane = product === "workspace" ? account.workspace : account.global;

  if (!lane) {
    return <ProductEmpty product={product} />;
  }

  if (lane.status === "provisioning") {
    return <IssuingSkeleton />;
  }

  if (lane.status === "unpaid" || lane.status === "failed") {
    return <ProductEmpty product={product} status={lane.status} planId={lane.planId} />;
  }

  const hybrid = product === "global" && publicServiceFromPlanId(lane.planId) === "hybrid";
  const statusLabel = lane.failover ? t("statusFailover") : t("statusActive");
  const title =
    product === "workspace" ? t("workspaceTitle") : hybrid ? t("hybridTitle") : t("globalTitle");
  const description =
    product === "workspace" ? t("workspaceDesc") : hybrid ? t("hybridDesc") : t("globalDesc");
  const hasAccess = Boolean(lane.deepLink || lane.yamlUrl);
  const hasBackup = Boolean(lane.vaultUrl || lane.syncthingUrl);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        <StatusPill label={statusLabel} tone={lane.failover ? "warn" : "ok"} />
      </div>

      {lane.failover ? (
        <div className="rounded-[10px] border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
          <p>{t("failoverBanner")}</p>
          <p className="mt-2 text-xs text-amber-200/90">{t("karingRefreshHint")}</p>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <MetaCard label={t("plan")} value={lane.planName} />
        <MetaCard label={t("expires")} value={formatDate(locale, lane.expiresAt)} />
        <MetaCard label={t("nodes")} value={lane.nodes.join(" · ") || "—"} mono />
      </section>

      {hasAccess ? (
        <>
          <section className="rounded-2xl border border-border bg-card p-5">
            <UsageMeter
              label={lane.failover ? t("usageUnlimited") : t("usageTraffic")}
              used={lane.trafficUsedGb}
              limit={lane.trafficLimitGb}
              unlimited={lane.failover}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-[auto_1fr]">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-sm">{t("karing")}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{t("karingRefreshHint")}</p>
              <div className="mt-4">
                <QrPanel value={lane.deepLink} label={t("karingQr")} />
              </div>
            </div>
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
              <CopyField label={t("deepLink")} value={lane.deepLink} />
              <CopyField label={t("yamlUrl")} value={lane.yamlUrl} />
              <Button
                type="button"
                variant="outline"
                className="rounded-[10px]"
                onClick={() => downloadFromUrl("acrossflare.yaml", lane.yamlUrl, "text/yaml")}
              >
                <Download />
                {t("yamlDownload")}
              </Button>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm text-muted-foreground">{t("pendingCredentials")}</p>
        </section>
      )}

      {hasBackup ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <p className="text-sm">{t("backup")}</p>
          <p className="mt-2 text-sm text-muted-foreground">{t("backupDesc")}</p>
          <div className="mt-4 space-y-4">
            <UsageMeter
              label={t("backupUsage")}
              used={lane.backupUsedGb}
              limit={lane.backupLimitGb}
            />
            <CopyField label={t("vaultUrl")} value={lane.vaultUrl} />
            <CopyField label={t("syncthingUrl")} value={lane.syncthingUrl} />
            <CopyField label={t("syncthingFolder")} value={lane.syncthingFolderId} />
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <Link
                href="/dashboard"
                className="inline-flex text-sm text-primary transition-colors hover:text-primary/80"
              >
                {t("openBackupPwa")}
              </Link>
              <Link
                href={{ pathname: SUPPORT_HREF, hash: "backup" }}
                className="inline-flex text-sm text-primary transition-colors hover:text-primary/80"
              >
                {t("backupHowToMore")}
              </Link>
            </div>
          </div>
        </section>
      ) : null}
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
