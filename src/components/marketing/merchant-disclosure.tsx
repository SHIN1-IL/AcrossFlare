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

function MerchantLine({ id, value }: { id: MerchantRowId; value: string }) {
  const t = useTranslations("footer");

  return (
    <div className="flex min-w-0 gap-1.5">
      <span className="shrink-0 text-muted-foreground/70">{t(id)}</span>
      <span className="min-w-0 break-words text-muted-foreground">
        <MerchantValue id={id} value={value} />
      </span>
    </div>
  );
}

export function MerchantDisclosure({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("footer");
  const rows = merchantRows(getMerchant());
  const compactColumns = compact
    ? [rows.slice(0, 4), rows.slice(4, 8), rows.slice(8)]
    : [];

  return (
    <div id="merchant" className="scroll-mt-24">
      <p
        className={
          compact
            ? "text-[9px] font-medium tracking-[0.14em] text-foreground/80 uppercase"
            : "text-xs font-medium tracking-[0.14em] text-foreground/80 uppercase"
        }
      >
        {t("merchantTitle")}
      </p>
      {compact ? (
        <div className="mt-1 grid grid-cols-3 gap-x-4 text-[10px] leading-tight">
          {compactColumns.map((column, index) => (
            <div key={index} className="flex min-w-0 flex-col gap-y-0.5">
              {column.map((row) => (
                <MerchantLine key={row.id} id={row.id} value={row.value} />
              ))}
              {index === compactColumns.length - 1 ? (
                <p className="text-muted-foreground">{t("escrow")}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
