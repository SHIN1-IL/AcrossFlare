"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import {
  KARING_DOWNLOAD_PAGE,
  detectKaringOsFromNavigator,
  fetchKaringLatestRelease,
  resolveKaringDownload,
  type DetectedKaringOs,
  type KaringReleaseAsset,
  type NavigatorLike,
} from "@/lib/karing-download";
import { cn } from "@/lib/utils";

export function KaringDownloadCta({
  assets,
  initialOs,
  tagName,
  className,
}: {
  assets: KaringReleaseAsset[];
  initialOs: DetectedKaringOs;
  tagName: string;
  className?: string;
}) {
  const t = useTranslations("support");
  const [os, setOs] = useState(initialOs);
  const [releaseAssets, setReleaseAssets] = useState(assets);
  const [version, setVersion] = useState(tagName);
  const [loading, setLoading] = useState(assets.length === 0 && initialOs.id !== "ios");
  const download = resolveKaringDownload(os, releaseAssets);
  const osName = t(`downloads.os.${os.label}`);
  const label = loading
    ? t("downloads.ctaLoading")
    : os.id === "other"
      ? t("downloads.cta")
      : version
        ? t("downloads.ctaOsVersion", { os: osName, version })
        : t("downloads.ctaOs", { os: osName });

  useEffect(() => {
    let cancelled = false;
    const nav = navigator as NavigatorLike;
    setOs(detectKaringOsFromNavigator(nav));

    nav.userAgentData?.getHighEntropyValues?.(["architecture", "platform"]).then((hints) => {
      if (cancelled) return;
      setOs(detectKaringOsFromNavigator(nav, { architecture: hints.architecture }));
    });

    if (assets.length > 0 && tagName) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    fetchKaringLatestRelease().then((release) => {
      if (cancelled) return;
      if (release) {
        if (release.assets.length > 0) setReleaseAssets(release.assets);
        if (release.tagName) setVersion(release.tagName);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [assets.length, tagName]);

  return (
    <div className={cn("mt-5 space-y-3", className)}>
      <a
        href={download.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-busy={loading}
        className={cn(
          buttonVariants({ size: "lg" }),
          "h-auto min-h-11 w-full whitespace-normal px-4 py-2.5 text-center sm:w-auto",
          loading && "opacity-70"
        )}
      >
        <Download aria-hidden="true" />
        {label}
      </a>
      <p className="text-sm text-muted-foreground">
        {t("downloads.environment", { os: osName })}
      </p>
      <a
        href={KARING_DOWNLOAD_PAGE}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
      >
        {t("downloads.otherOs")}
      </a>
    </div>
  );
}
