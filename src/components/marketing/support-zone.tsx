"use client";

import { BookOpen, CircleHelp, Download, HardDrive, LifeBuoy, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { BackupSetupGuide } from "@/components/marketing/backup-guide";
import { KaringDownloadCta } from "@/components/marketing/karing-download";
import { KaringHelpFaq, KaringSetupGuide } from "@/components/marketing/karing-guide";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { StageBackdrop } from "@/components/marketing/plan-stage-bg";
import {
  detectKaringOsFromNavigator,
  type DetectedKaringOs,
  type NavigatorLike,
} from "@/lib/karing-download";
import {
  SUPPORT_SECTIONS,
  karingInstallPlatformFor,
  type SupportSectionId,
} from "@/lib/support-zone";

const SECTION_ICONS: Record<SupportSectionId, LucideIcon> = {
  downloads: Download,
  setup: BookOpen,
  backup: HardDrive,
  faq: CircleHelp,
};

const DEFAULT_OS: DetectedKaringOs = {
  id: "other",
  label: "other",
  arch: "unknown",
};

export function SupportZone() {
  const t = useTranslations("support");
  const [initialOs, setInitialOs] = useState(DEFAULT_OS);

  useEffect(() => {
    const nav = navigator as NavigatorLike;
    setInitialOs(detectKaringOsFromNavigator(nav));
    nav.userAgentData?.getHighEntropyValues?.(["architecture", "platform"]).then((hints) => {
      setInitialOs(detectKaringOsFromNavigator(nav, { architecture: hints.architecture }));
    });
  }, []);

  return (
    <MarketingShell>
      <section className="relative isolate overflow-hidden">
        <StageBackdrop variant={4} />
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-16 md:py-24">
          <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">
            AcrossFlare
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <LifeBuoy aria-hidden="true" className="size-5" />
            </span>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">{t("title")}</h1>
          </div>
          <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">{t("lead")}</p>

          <ol className="mt-12 space-y-5">
            {SUPPORT_SECTIONS.map((section, index) => {
              const Icon = SECTION_ICONS[section.id];

              return (
                <li key={section.id}>
                  <article
                    id={section.id}
                    className="scroll-mt-24 rounded-2xl border border-border/80 bg-card/70 p-6 shadow-[0_18px_60px_-32px_rgba(16,185,129,0.45)] backdrop-blur-sm transition-colors target:border-primary/50 md:p-8"
                  >
                    <div className="flex items-start gap-4">
                      <span className="font-mono text-sm tracking-[0.18em] text-primary/80">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex size-9 items-center justify-center rounded-[10px] bg-primary/12 text-primary">
                            <Icon aria-hidden="true" className="size-4" />
                          </span>
                          <h2 className="text-xl tracking-tight md:text-2xl">
                            {t(`${section.id}.title`)}
                          </h2>
                        </div>
                        {section.id === "downloads" ? (
                          <div className="mt-5 rounded-2xl border border-primary/25 bg-primary/[0.07] p-6 text-center md:p-8">
                            <p className="mx-auto max-w-lg text-sm leading-6 text-muted-foreground">
                              {t("downloads.lead")}
                            </p>
                            <KaringDownloadCta
                              assets={[]}
                              initialOs={initialOs}
                              tagName=""
                              className="mt-5 flex flex-col items-center"
                            />
                          </div>
                        ) : null}
                        {section.id === "setup" ? (
                          <KaringSetupGuide activePlatform={karingInstallPlatformFor(initialOs.id)} />
                        ) : null}
                        {section.id === "backup" ? <BackupSetupGuide /> : null}
                        {section.id === "faq" ? <KaringHelpFaq /> : null}
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </MarketingShell>
  );
}
