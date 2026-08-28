import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { KaringProfileCard } from "@/components/marketing/karing-profile-card";
import { getMerchant } from "@/lib/legal/merchant";
import {
  KARING_FAQ_ITEMS,
  KARING_INSTALL_PLATFORMS,
  KARING_SETUP_STEPS,
  type KaringInstallPlatformId,
  type KaringSetupProfile,
} from "@/lib/support-zone";
import { cn } from "@/lib/utils";

export async function KaringSetupGuide({
  activePlatform,
  profiles,
}: {
  activePlatform: KaringInstallPlatformId | null;
  profiles: KaringSetupProfile[];
}) {
  const t = await getTranslations("support");

  return (
    <div className="mt-5 space-y-5">
      <p className="text-sm text-muted-foreground">{t("setup.heading")}</p>
      <ol className="space-y-3">
        {KARING_SETUP_STEPS.map((step, index) => (
          <li
            key={step.id}
            className="flex items-start gap-4 rounded-xl border border-border bg-background/50 p-4 md:p-5"
          >
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-medium tracking-tight md:text-lg">
                {t(`setup.steps.${step.id}.title`)}
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {t(`setup.steps.${step.id}.body`)}
              </p>
              {step.id === "install" ? (
                <ul className="mt-3 grid gap-2">
                  {KARING_INSTALL_PLATFORMS.map((platform) => {
                    const active = platform.id === activePlatform;
                    return (
                      <li
                        key={platform.id}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-xs leading-5",
                          active
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-border/80 bg-card/40 text-muted-foreground"
                        )}
                      >
                        <span className="font-medium text-foreground">
                          {t(`downloads.os.${platform.id}`)}
                        </span>
                        <span className="mt-0.5 block">{t(`setup.install.${platform.id}`)}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {step.id === "profile" ? <KaringProfileCard profiles={profiles} /> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export async function KaringHelpFaq({ profiles }: { profiles: KaringSetupProfile[] }) {
  const t = await getTranslations("support");
  const merchant = getMerchant();
  const mailto = `mailto:${merchant.email}?subject=${encodeURIComponent("Karing setup")}`;

  return (
    <div className="mt-5 space-y-5">
      <dl className="space-y-3">
        {KARING_FAQ_ITEMS.map((item) => (
          <div key={item.id} className="rounded-xl border border-border bg-background/50 p-4 md:p-5">
            <dt className="text-sm font-medium">{t(`faq.items.${item.id}.q`)}</dt>
            <dd className="mt-1 text-sm leading-6 text-muted-foreground">{t(`faq.items.${item.id}.a`)}</dd>
            {item.id === "profileWhere" ? <KaringProfileCard profiles={profiles} /> : null}
          </div>
        ))}
      </dl>
      <div className="rounded-xl border border-border bg-background/50 p-5 text-center">
        <h3 className="text-sm font-medium">{t("faq.helpTitle")}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("faq.helpBody")}</p>
        <a
          href={mailto}
          className={cn(buttonVariants({ size: "lg" }), "mt-4 h-auto min-h-9 px-4 py-2")}
        >
          {t("faq.helpCta")}
        </a>
        <p className="mt-3 text-xs text-muted-foreground">
          <a href={`mailto:${merchant.email}`} className="transition-colors hover:text-foreground">
            {merchant.email}
          </a>
          {" · "}
          <a href={`tel:${merchant.phone.replace(/-/g, "")}`} className="transition-colors hover:text-foreground">
            {merchant.phone}
          </a>
        </p>
      </div>
    </div>
  );
}
