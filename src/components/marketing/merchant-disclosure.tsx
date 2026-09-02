"use client";

import { useTranslations } from "next-intl";
import { getMerchant, merchantRows, type MerchantRowId } from "@/lib/legal/merchant";

function MerchantValue({ id, value }: { id: MerchantRowId; value: string }) {
  if (id === "phone") {
    return (
      <a href={`tel:${value.replace(/-/g, "")}`} className="transition-colors hover:text-foreground">
        {value}
      </a>
    );
  }

  if (id === "email") {
    return (
      <a href={`mailto:${value}`} className="transition-colors hover:text-foreground">
        {value}
      </a>
    );
  }

  return value;
}

export function MerchantDisclosure() {
  const t = useTranslations("footer");
  const rows = merchantRows(getMerchant());

  return (
    <div id="merchant" className="scroll-mt-24">
      <p className="text-xs font-medium tracking-[0.14em] text-foreground/80 uppercase">
        {t("merchantTitle")}
      </p>
      <dl className="mt-3 grid gap-x-10 gap-y-2 text-xs sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.id} className="flex gap-2">
            <dt className="shrink-0 text-muted-foreground/70">{t(row.id)}</dt>
            <dd className="min-w-0 break-words text-muted-foreground">
              <MerchantValue id={row.id} value={row.value} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">{t("escrow")}</p>
    </div>
  );
}
