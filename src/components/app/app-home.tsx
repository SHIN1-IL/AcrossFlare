"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { StatusPill } from "@/components/app/status-pill";
import { useAccount } from "@/hooks/use-account";
import { publicServiceFromPlanId, publicServiceHref } from "@/lib/public-service";
import { cn } from "@/lib/utils";

export function AppHome() {
  const t = useTranslations("app");
  const { account } = useAccount();

  if (!account) {
    return null;
  }

  const empty = !account.global && !account.marketing && !account.workspace;
  const network = publicServiceFromPlanId(account.global?.planId);
  const networkHref = publicServiceHref(network);
  const hybrid = network === "hybrid";

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
        AcrossFlare
      </p>
      <h1 className="mt-3 text-3xl tracking-tight">{t("homeTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("homeSubtitle")}</p>

      {empty ? (
        <div className="mt-8 rounded-2xl border border-border bg-card p-8">
          <h2 className="text-xl tracking-tight">{t("emptyTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("emptyBody")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/standard" className={cn(buttonVariants(), "rounded-[10px]")}>
              {t("goCheckout")}
            </Link>
            <Link href="/workspace" className={cn(buttonVariants({ variant: "outline" }), "rounded-[10px]")}>
              {t("workspace")}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {account.global ? (
            <ProductLane
              title={hybrid ? t("hybridTitle") : t("globalTitle")}
              description={hybrid ? t("hybridDesc") : t("globalDesc")}
              href="/app/global"
              browseHref={networkHref}
              active={account.global.status === "active"}
              unpaid={account.global.status === "unpaid"}
              openLabel={t("open")}
              addLabel={t("addGlobal")}
              statusLabel={
                account.global.failover
                  ? t("statusFailover")
                  : account.global.status === "provisioning"
                    ? t("statusProvisioning")
                    : account.global.status === "failed"
                      ? t("statusFailed")
                      : account.global.status === "active"
                        ? t("statusActive")
                        : t("statusUnpaid")
              }
              tone={
                account.global.failover || account.global.status === "failed"
                  ? "warn"
                  : account.global.status === "active"
                    ? "ok"
                    : "neutral"
              }
            />
          ) : null}
          {account.workspace ? (
            <ProductLane
              title={t("workspaceTitle")}
              description={t("workspaceDesc")}
              href="/app/workspace"
              browseHref="/workspace"
              active={account.workspace.status === "active"}
              unpaid={account.workspace.status === "unpaid"}
              openLabel={t("open")}
              addLabel={t("addWorkspace")}
              statusLabel={
                account.workspace.status === "provisioning"
                  ? t("statusProvisioning")
                  : account.workspace.status === "failed"
                    ? t("statusFailed")
                    : account.workspace.status === "active"
                      ? t("statusActive")
                      : t("statusUnpaid")
              }
              tone={
                account.workspace.status === "failed"
                  ? "warn"
                  : account.workspace.status === "active"
                    ? "ok"
                    : "neutral"
              }
            />
          ) : null}
          {account.marketing ? (
            <ProductLane
              title={t("marketingTitle")}
              description={t("marketingDesc")}
              href="/app/marketing"
              browseHref="/standard"
              active={account.marketing.status === "active"}
              unpaid={account.marketing.status === "unpaid"}
              openLabel={t("open")}
              addLabel={t("addMarketing")}
              statusLabel={
                account.marketing.status === "provisioning"
                  ? t("statusProvisioning")
                  : account.marketing.status === "failed"
                    ? t("statusFailed")
                    : account.marketing.status === "active"
                      ? t("statusActive")
                      : t("statusUnpaid")
              }
              tone={
                account.marketing.status === "failed"
                  ? "warn"
                  : account.marketing.status === "active"
                    ? "ok"
                    : "neutral"
              }
              muted
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function ProductLane({
  title,
  description,
  href,
  browseHref,
  active,
  unpaid,
  openLabel,
  addLabel,
  statusLabel,
  tone,
  muted,
}: {
  title: string;
  description: string;
  href: "/app/global" | "/app/marketing" | "/app/workspace";
  browseHref: "/standard" | "/hybrid" | "/workspace";
  active: boolean;
  unpaid: boolean;
  openLabel: string;
  addLabel: string;
  statusLabel: string;
  tone: "ok" | "warn" | "neutral";
  muted?: boolean;
}) {
  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border p-6",
        muted ? "border-border bg-card" : "border-primary/25 bg-card"
      )}
    >
      <StatusPill label={statusLabel} tone={tone} />
      <h2 className="mt-4 text-xl tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      <Link
        href={active || !unpaid ? href : browseHref}
        className={cn(
          buttonVariants({ variant: muted ? "outline" : "default" }),
          "mt-6 w-fit rounded-[10px]"
        )}
      >
        {unpaid ? addLabel : openLabel}
      </Link>
    </article>
  );
}
