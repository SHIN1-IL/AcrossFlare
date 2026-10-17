"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import type { PublicServiceId } from "@/lib/public-service";
import type { SubscriptionPreviewProxy } from "@/lib/provision/build";

type Preview = {
  proxies: SubscriptionPreviewProxy[];
  karingUrl: string;
};

export function SubscriptionRefreshTest({
  customerId,
  service,
}: {
  customerId?: string;
  service?: PublicServiceId;
}) {
  const t = useTranslations("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);

  const href = customerId
    ? `/api/v1/admin/customers/${customerId}/subscription-preview`
    : service
      ? `/api/v1/admin/subscription-preview?service=${service}`
      : "";

  if (!href) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-[10px] border border-border bg-background/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-5 text-muted-foreground">{t("subscriptionRefreshHint")}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-[10px]"
          disabled={loading}
          onClick={() => {
            setError("");
            setLoading(true);
            void fetch(href, { cache: "no-store" })
              .then(async (response) => {
                if (!response.ok) {
                  throw new Error("refresh_failed");
                }
                return (await response.json()) as Preview;
              })
              .then((body) => {
                setPreview(body);
              })
              .catch(() => {
                setPreview(null);
                setError(t("subscriptionRefreshFailed"));
              })
              .finally(() => {
                setLoading(false);
              });
          }}
        >
          {t("subscriptionRefresh")}
        </Button>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {preview ? (
        <div className="space-y-3">
          {preview.proxies.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("subscriptionRefreshEmpty")}</p>
          ) : (
            <ul className="space-y-1 font-mono text-xs text-muted-foreground">
              {preview.proxies.map((proxy) => (
                <li key={`${proxy.name}-${proxy.server}`}>
                  {proxy.name} · {proxy.server}:{proxy.port}
                  {proxy.servername ? ` · ${proxy.servername}` : ""}
                </li>
              ))}
            </ul>
          )}
          <a
            href={preview.karingUrl}
            className="inline-flex h-8 items-center rounded-[10px] border border-border px-3 text-sm transition-colors hover:bg-accent"
          >
            {t("subscriptionRefreshApply")}
          </a>
        </div>
      ) : null}
    </div>
  );
}
