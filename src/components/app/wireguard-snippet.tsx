"use client";

import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { downloadText } from "@/lib/download";

export function WireGuardSnippet({
  config,
  filename,
}: {
  config: string;
  filename: string;
}) {
  const t = useTranslations("app");

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm">{t("wireguard")}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-[10px]"
          onClick={() => downloadText(filename, config, "text/plain")}
        >
          <Download />
          {t("wgDownload")}
        </Button>
      </div>
      <pre className="mt-4 overflow-x-auto rounded-[10px] border border-border bg-surface-2 p-3 font-mono text-[11px] leading-5 text-muted-foreground">
        {config}
      </pre>
    </div>
  );
}
