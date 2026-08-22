"use client";

import { useLocale, useTranslations } from "next-intl";
import { IssuingSkeleton, ProductEmpty } from "@/components/app/product-empty";
import { ProxyEndpointCard } from "@/components/app/proxy-endpoint-card";
import { RotateButton } from "@/components/app/rotate-button";
import { StatusPill } from "@/components/app/status-pill";
import { WireGuardSnippet } from "@/components/app/wireguard-snippet";
import { useAccount } from "@/hooks/use-account";
import { useNow } from "@/hooks/use-now";
import { rotateMarketingIp } from "@/lib/account-store";
import { formatDateTime } from "@/lib/format-date";
import { httpProxyUrl, socksProxyUrl, wireGuardConfig } from "@/lib/account";

export function MarketingDashboard() {
  const t = useTranslations("app");
  const locale = useLocale();
  const now = useNow();
  const { account, rotating, rotateError } = useAccount();

  if (!account) {
    return null;
  }

  if (!account.marketing) {
    return <ProductEmpty product="marketing" />;
  }

  if (account.marketing.status === "provisioning") {
    return <IssuingSkeleton />;
  }

  const marketing = account.marketing;
  const locked = Boolean(
    rotating || (marketing.rotateLockedUntil && now > 0 && marketing.rotateLockedUntil > now)
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl tracking-tight">{t("marketingTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("marketingDesc")}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill label={t("statusActive")} tone="ok" />
          <RotateButton
            lockedUntil={marketing.rotateLockedUntil}
            rotating={rotating}
            onRotate={() => {
              void rotateMarketingIp();
            }}
          />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetaCard label={t("exitIp")} value={marketing.exitIp} mono />
        <MetaCard label={t("region")} value={marketing.region} />
        <MetaCard
          label={t("lastRotate")}
          value={
            marketing.lastRotateAt
              ? formatDateTime(locale, marketing.lastRotateAt)
              : t("neverRotated")
          }
        />
        <MetaCard label={t("lock")} value={locked || rotating ? t("lockBusy") : t("lockFree")} />
      </section>

      {rotateError ? <p className="text-sm text-destructive">{t("rotateFailed")}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <ProxyEndpointCard title={t("http")} value={httpProxyUrl(marketing)} />
        <ProxyEndpointCard title={t("socks5")} value={socksProxyUrl(marketing)} />
      </div>

      <WireGuardSnippet
        config={wireGuardConfig(marketing)}
        filename="acrossflare-marketing.conf"
      />
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
      <p className={`mt-2 text-sm ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}
