"use client";

import { useLocale, useTranslations } from "next-intl";
import { esimCompareSets, esimDataOffers } from "@/lib/esim/compare";
import { formatPrimaryPrice } from "@/lib/format-price";
import type { AppLocale } from "@/i18n/routing";

export function EsimCompare() {
  const t = useTranslations("esimCompare");
  const locale = useLocale() as AppLocale;
  const offers = esimDataOffers();
  const sets = esimCompareSets();

  return (
    <div className="h-full overflow-y-auto px-4 pt-16 pb-6">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center">
        <h2 className="text-center text-[clamp(1.25rem,3vw,1.8rem)] font-semibold tracking-[-0.03em] text-[#f4f4f5]">
          {t("title")}
        </h2>
        <p className="mt-2 text-center text-[clamp(0.8rem,1.8vw,0.95rem)] text-[#a1a1aa]">{t("lead")}</p>

        <p className="mt-6 text-xs font-medium tracking-[0.08em] text-[#6ee7b7]">{t("dataHeading")}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:gap-3">
          {offers.map((offer) => (
            <article key={offer.id} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
              <p className="text-sm text-[#d4d4d8]">
                {offer.dataGb}GB · {t("days", { days: offer.days })}
              </p>
              <p className="mt-1 font-mono text-[clamp(1.15rem,2.4vw,1.5rem)] text-[#f4f4f5]">
                {formatPrimaryPrice(locale, offer.prices)}
              </p>
            </article>
          ))}
        </div>

        <p className="mt-5 text-xs font-medium tracking-[0.08em] text-[#6ee7b7]">{t("setHeading")}</p>
        <div className="mt-2 overflow-hidden rounded-xl border border-white/10">
          <table className="w-full border-collapse text-left text-[clamp(0.72rem,1.7vw,0.9rem)]">
            <thead>
              <tr className="text-[#a1a1aa]">
                <th className="px-3 py-2 font-medium" />
                {offers.map((offer) => (
                  <th key={offer.id} className="px-3 py-2 font-medium">
                    {offer.dataGb}GB
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sets.map((row) => (
                <tr key={row.id} className="border-t border-white/10">
                  <th className="px-3 py-2 font-medium text-[#e4e4e7]">
                    <span className="block">{t(row.tier)}</span>
                    <span className="block font-normal text-[#a1a1aa]">{t(row.term)}</span>
                  </th>
                  {row.cells.map((cell) => (
                    <td key={cell.productId} className="px-3 py-2 font-mono whitespace-nowrap text-[#f4f4f5]">
                      {formatPrimaryPrice(locale, cell.prices)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-center text-[clamp(0.7rem,1.5vw,0.8rem)] leading-relaxed text-[#a1a1aa]">
          {t("guide")}
        </p>
      </div>
    </div>
  );
}
