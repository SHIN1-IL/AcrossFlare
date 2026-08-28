"use client";

import { useTranslations } from "next-intl";
import { CopyField } from "@/components/app/copy-field";
import { QrPanel } from "@/components/app/qr-panel";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import type { KaringSetupProfile } from "@/lib/support-zone";
import { cn } from "@/lib/utils";

export function KaringProfileCard({ profiles }: { profiles: KaringSetupProfile[] }) {
  const t = useTranslations("support");
  const tApp = useTranslations("app");

  if (profiles.length === 0) {
    return (
      <div className="mt-3 rounded-xl border border-dashed border-border bg-background/40 px-4 py-3">
        <p className="text-sm text-muted-foreground">{t("setup.steps.profile.empty")}</p>
        <Link
          href="/app"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-3 rounded-[10px]")}
        >
          {t("setup.steps.profile.openApp")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-4">
      {profiles.map((profile) => (
        <div
          key={profile.id}
          className="grid gap-4 rounded-xl border border-border bg-background/40 p-4 lg:grid-cols-[auto_1fr]"
        >
          {profile.deepLink ? (
            <QrPanel
              value={profile.deepLink}
              label={t("setup.steps.profile.qrLabel")}
              copyImageLabel={t("setup.steps.profile.copyQr")}
              copiedImageLabel={t("setup.steps.profile.qrCopied")}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{t("setup.steps.profile.empty")}</p>
          )}
          <div className="min-w-0 space-y-3">
            <p className="text-sm font-medium">{profile.planName}</p>
            {profile.yamlUrl ? <CopyField label={tApp("yamlUrl")} value={profile.yamlUrl} /> : null}
            {profile.deepLink ? (
              <CopyField label={t("setup.steps.profile.qrValue")} value={profile.deepLink} />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
