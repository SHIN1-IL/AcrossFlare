"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { StatusPill } from "@/components/app/status-pill";
import { useAccount } from "@/hooks/use-account";
import { cn } from "@/lib/utils";

export function AppHome() {
  const t = useTranslations("app");
  const { account } = useAccount();

  if (!account) {
    return null;
  }

  const empty = !account.global && !account.marketing;

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
          <Link
            href="/pricing"
            className={cn(buttonVariants(), "mt-6 rounded-[10px]")}
          >
            {t("goCheckout")}
          </Link>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <ProductLane
          title={t("globalTitle")}
          description={t("globalDesc")}
          href="/app/global"
          checkoutHref={{ pathname: "/checkout", query: { product: "global", plan: "global-standard" } }}
          active={Boolean(account.global && account.global.status === "active")}
          unpaid={!account.global || account.global.status === "unpaid"}
          openLabel={t("open")}
          addLabel={t("addGlobal")}
          statusLabel={
            account.global?.failover
              ? t("statusFailover")
              : account.global?.status === "provisioning"
                ? t("statusProvisioning")
                : account.global?.status === "failed"
                  ? t("statusFailed")
                  : account.global?.status === "active"
                    ? t("statusActive")
                    : t("statusUnpaid")
          }
          tone={
            account.global?.failover || account.global?.status === "failed"
              ? "warn"
              : account.global?.status === "active"
                ? "ok"
                : "neutral"
          }
        />
        <ProductLane
          title={t("marketingTitle")}
          description={t("marketingDesc")}
          href="/app/marketing"
          checkoutHref={{ pathname: "/checkout", query: { product: "marketing", plan: "marketing-standard" } }}
          active={Boolean(account.marketing && account.marketing.status === "active")}
          unpaid={!account.marketing || account.marketing.status === "unpaid"}
          openLabel={t("open")}
          addLabel={t("addMarketing")}
          statusLabel={
            account.marketing?.status === "provisioning"
              ? t("statusProvisioning")
              : account.marketing?.status === "failed"
                ? t("statusFailed")
                : account.marketing?.status === "active"
                  ? t("statusActive")
                  : t("statusUnpaid")
          }
          tone={
            account.marketing?.status === "failed"
              ? "warn"
              : account.marketing?.status === "active"
                ? "ok"
                : "neutral"
          }
          muted
        />
      </div>
    </div>
  );
}

function ProductLane({
  title,
  description,
  href,
  checkoutHref,
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
  href: "/app/global" | "/app/marketing";
  checkoutHref: { pathname: "/checkout"; query: { product: string; plan: string } };
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
        href={active || !unpaid ? href : checkoutHref}
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
