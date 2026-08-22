import { Cloud, Languages, Zap } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const t = await getTranslations("landing");

  return (
    <MarketingShell>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <h1 className="max-w-3xl text-4xl font-medium tracking-tight md:text-6xl">
            {t("headline")}
          </h1>
          <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            {t("subhead")}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={{ pathname: "/signup", query: { product: "global" } }}
              className={cn(buttonVariants({ size: "lg" }), "rounded-[10px]")}
            >
              {t("ctaGlobal")}
            </Link>
            <Link
              href={{ pathname: "/signup", query: { product: "marketing" } }}
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-[10px]"
              )}
            >
              {t("ctaMarketing")}
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface/60">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:grid-cols-3">
          <TrustItem icon={Cloud} label={t("trustCloudflare")} />
          <TrustItem icon={Zap} label={t("trustProvisioning")} />
          <TrustItem icon={Languages} label={t("trustLanguages")} />
        </div>
      </section>

      <section id="products" className="mx-auto max-w-6xl px-4 py-20">
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
          {t("productsEyebrow")}
        </p>
        <h2 className="mt-2 text-2xl tracking-tight md:text-3xl">{t("productsTitle")}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <ProductCard
            badge={t("globalBadge")}
            title={t("globalTitle")}
            description={t("globalDesc")}
            points={[t("globalPoints.0"), t("globalPoints.1"), t("globalPoints.2")]}
            href={{ pathname: "/signup", query: { product: "global" } }}
            cta={t("ctaGlobal")}
          />
          <ProductCard
            badge={t("marketingBadge")}
            title={t("marketingTitle")}
            description={t("marketingDesc")}
            points={[
              t("marketingPoints.0"),
              t("marketingPoints.1"),
              t("marketingPoints.2"),
            ]}
            href={{ pathname: "/signup", query: { product: "marketing" } }}
            cta={t("ctaMarketing")}
            muted
          />
        </div>
      </section>
    </MarketingShell>
  );
}

function TrustItem({
  icon: Icon,
  label,
}: {
  icon: typeof Cloud;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <Icon className="size-4 text-primary" />
      {label}
    </div>
  );
}

function ProductCard({
  badge,
  title,
  description,
  points,
  href,
  cta,
  muted,
}: {
  badge: string;
  title: string;
  description: string;
  points: string[];
  href: { pathname: "/signup"; query: { product: string } };
  cta: string;
  muted?: boolean;
}) {
  return (
    <article
      className={cn(
        "flex flex-col rounded-2xl border p-6",
        muted ? "border-border bg-card" : "border-primary/25 bg-card"
      )}
    >
      <p className="text-xs font-medium tracking-wide text-primary uppercase">{badge}</p>
      <h3 className="mt-3 text-xl tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
        {points.map((point) => (
          <li key={point} className="flex gap-2">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
            {point}
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={cn(
          buttonVariants({ variant: muted ? "outline" : "default", size: "lg" }),
          "mt-6 w-fit rounded-[10px]"
        )}
      >
        {cta}
      </Link>
    </article>
  );
}
