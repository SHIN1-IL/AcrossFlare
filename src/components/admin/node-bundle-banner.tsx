"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { KaringConnectPanel } from "@/components/app/karing-connect-panel";
import { Button } from "@/components/ui/button";
import type { AdminPoolCapacity } from "@/lib/admin";
import { issueGroupKaring } from "@/lib/admin-store";

export function NodeBundleBanner({
  poolName,
  group,
  simulate,
}: {
  poolName: string;
  group: AdminPoolCapacity["groups"][number];
  simulate: boolean;
}) {
  const t = useTranslations("admin");
  const [yamlUrl, setYamlUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const signature = group.nodes.map((node) => node.id).join(",");
  const [bundleKey, setBundleKey] = useState(signature);
  if (bundleKey !== signature) {
    setBundleKey(signature);
    setYamlUrl("");
    setError("");
  }

  async function open() {
    setBusy(true);
    setError("");
    const result = await issueGroupKaring(group.id);
    setBusy(false);
    if (!result.ok) {
      setYamlUrl("");
      setError(messageFor(result.error));
      return;
    }
    setYamlUrl(result.yamlUrl);
  }

  function messageFor(code: string) {
    if (code === "reality_not_configured") {
      return t("karingRealityMissing");
    }
    if (code === "node_not_ready") {
      return t("karingNodeNotReady");
    }
    if (code === "plan_missing") {
      return t("karingPlanMissing");
    }
    if (code === "inbound_missing") {
      return t("karingInboundMissing");
    }
    if (code === "panel_unreachable") {
      return t("karingPanelUnreachable");
    }
    return t("karingCheckFail", { error: code });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{t("karingBundleTitle", { count: group.nodes.length })}</p>
          <p className="mt-1 text-xs text-muted-foreground">{poolName}</p>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("karingBundleHint")}</p>
        </div>
        {yamlUrl ? null : (
          <Button type="button" className="rounded-[10px]" disabled={busy} onClick={() => void open()}>
            {busy ? t("karingChecking") : t("karingBundleOpen")}
          </Button>
        )}
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {group.nodes.map((node, index) => (
          <li key={node.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
            <span>
              <span className="mr-2 font-mono text-xs text-muted-foreground">{index + 1}</span>
              {node.name}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{node.ddns}</span>
          </li>
        ))}
      </ul>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {yamlUrl ? (
        <>
          {simulate ? <p className="text-sm text-muted-foreground">{t("karingSimulateHint")}</p> : null}
          <KaringConnectPanel yamlUrl={yamlUrl} showDownload />
        </>
      ) : null}
    </section>
  );
}
