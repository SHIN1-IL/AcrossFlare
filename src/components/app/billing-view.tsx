"use client";

import { useLocale, useTranslations } from "next-intl";
import { StatusPill } from "@/components/app/status-pill";
import { useAccount } from "@/hooks/use-account";
import { formatDate } from "@/lib/format-date";
import { formatPrimaryPrice } from "@/lib/format-price";
import { getPlanById } from "@/lib/plans";
import type { AppLocale } from "@/i18n/routing";

export function BillingView() {
  const t = useTranslations("app");
  const locale = useLocale() as AppLocale;
  const { account } = useAccount();

  if (!account) {
    return null;
  }

  const nextCharge = account.global?.expiresAt ?? account.marketing?.expiresAt;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl tracking-tight">{t("billingTitle")}</h1>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">{t("nextCharge")}</p>
          <p className="mt-2 text-sm">
            {nextCharge ? formatDate(locale, nextCharge) : t("noReceipts")}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">{t("paymentMethod")}</p>
          <p className="mt-2 text-sm">
            {account.method === "alipay" ? t("methodAlipay") : t("methodCard", { last4: "4242" })}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <p className="text-sm">{t("receipts")}</p>
        {account.receipts.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("noReceipts")}</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 font-medium">{t("receiptId")}</th>
                  <th className="py-2 font-medium">{t("receiptDate")}</th>
                  <th className="py-2 font-medium">{t("receiptProduct")}</th>
                  <th className="py-2 font-medium">{t("receiptAmount")}</th>
                </tr>
              </thead>
              <tbody>
                {account.receipts.map((receipt) => {
                  const plan = getPlanById(receipt.planId);
                  return (
                    <tr key={receipt.id} className="border-b border-border/70">
                      <td className="py-3 font-mono text-xs">{receipt.id}</td>
                      <td className="py-3 text-muted-foreground">
                        {formatDate(locale, receipt.date)}
                      </td>
                      <td className="py-3">
                        <StatusPill
                          label={receipt.product === "global" ? t("global") : t("marketing")}
                          tone="neutral"
                        />
                      </td>
                      <td className="py-3 font-mono text-xs">
                        {plan ? formatPrimaryPrice(locale, plan.prices) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
