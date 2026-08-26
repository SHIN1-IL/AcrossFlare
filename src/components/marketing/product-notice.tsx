import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getMerchant } from "@/lib/legal/merchant";
import type { MarketingServiceId } from "@/lib/marketing-services";

const TERM_KEY = {
  standard: "standardTerms",
  hybrid: "hybridTerms",
  workspace: "workspaceTerms",
} as const;

export async function ProductNotice({ service }: { service: MarketingServiceId }) {
  const t = await getTranslations("productNotice");
  const merchant = getMerchant();
  const rows = [
    {
      id: "supplier",
      value: t("supplierValue", {
        legalName: merchant.legalName,
        serviceName: merchant.serviceName,
      }),
    },
    { id: "terms", value: t(TERM_KEY[service]) },
    { id: "delivery", value: t(service === "workspace" ? "workspaceDeliveryValue" : "deliveryValue") },
    { id: "requirements", value: t("requirementsValue") },
    { id: "withdraw", value: t("withdrawValue") },
    {
      id: "support",
      value: `${merchant.phone} / ${merchant.email}`,
    },
  ] as const;

  return (
    <section className="border-t border-border">
      <div id="product-info" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-10">
        <p className="text-xs font-medium tracking-[0.14em] text-foreground/80 uppercase">
          {t("title")}
        </p>
        <dl className="mt-3 grid gap-x-10 gap-y-2 text-xs sm:grid-cols-2">
          {rows.map((row) => {
            const wide =
              row.id === "withdraw" ||
              row.id === "terms" ||
              row.id === "delivery" ||
              row.id === "requirements";

            return (
              <div key={row.id} className={wide ? "sm:col-span-2" : undefined}>
                <div className="flex gap-2">
                  <dt className="shrink-0 text-muted-foreground/70">{t(row.id)}</dt>
                  <dd className="min-w-0 break-words text-muted-foreground">
                    {row.id === "withdraw" ? (
                      <>
                        {row.value}{" "}
                        <Link
                          href={{ pathname: "/terms", hash: "refund" }}
                          className="transition-colors hover:text-foreground"
                        >
                          {t("withdrawLink")}
                        </Link>
                      </>
                    ) : row.id === "support" ? (
                      <>
                        <a
                          href={`tel:${merchant.phone.replace(/-/g, "")}`}
                          className="transition-colors hover:text-foreground"
                        >
                          {merchant.phone}
                        </a>
                        {" / "}
                        <a
                          href={`mailto:${merchant.email}`}
                          className="transition-colors hover:text-foreground"
                        >
                          {merchant.email}
                        </a>
                      </>
                    ) : (
                      row.value
                    )}
                  </dd>
                </div>
              </div>
            );
          })}
        </dl>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">{t("vat")}</p>
      </div>
    </section>
  );
}
