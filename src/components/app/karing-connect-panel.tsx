"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { CopyField } from "@/components/app/copy-field";
import { QrPanel } from "@/components/app/qr-panel";
import { Button } from "@/components/ui/button";
import { downloadFromUrl } from "@/lib/download";

export function KaringConnectPanel({
  yamlUrl,
  showDownload = false,
  children,
}: {
  yamlUrl: string;
  showDownload?: boolean;
  children?: ReactNode;
}) {
  const t = useTranslations("app");

  if (!yamlUrl) {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_1fr]">
        <p className="text-sm leading-6 text-muted-foreground">{t("missingSubscriptionUrl")}</p>
        {children ? <div className="space-y-4">{children}</div> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
      <div className="w-fit shrink-0 rounded-2xl border border-border bg-card p-5">
        <p className="text-sm">{t("karing")}</p>
        <p className="mt-2 max-w-56 text-xs leading-5 text-muted-foreground">{t("karingQrHint")}</p>
        <div className="mt-4">
          <QrPanel value={yamlUrl} label={t("karingQr")} />
        </div>
      </div>
      <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
        <CopyField label={t("yamlUrl")} value={yamlUrl} />
        {showDownload ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-[10px]"
            onClick={() => downloadFromUrl("acrossflare.yaml", yamlUrl, "text/yaml")}
          >
            <Download />
            {t("yamlDownload")}
          </Button>
        ) : null}
        {children}
      </div>
    </div>
  );
}
