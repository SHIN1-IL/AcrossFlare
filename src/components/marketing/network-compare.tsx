"use client";

import { useLocale, useTranslations } from "next-intl";
import { esimCompareSets, esimDataOffers } from "@/lib/esim/compare";
import { formatPrimaryPrice } from "@/lib/format-price";
import { networkCompareRows } from "@/lib/network/compare";
import type { AppLocale } from "@/i18n/routing";

const TIERS = ["standard", "hybrid"] as const;

export function NetworkCompare() {
  const t = useTranslations("networkCompare");
  const slides = useTranslations("planSlides");
  const locale = useLocale() as AppLocale;
  const rows = networkCompareRows();
  const offers = esimDataOffers();
  const sets = esimCompareSets();

  return (
    <div className="h-full overflow-y-auto px-4 pt-16 pb-6">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center">
        <h2 className="text-center text-[clamp(1.25rem,3vw,1.8rem)] font-semibold tracking-[-0.03em] text-[#f4f4f5]">
          {t("title")}
        </h2>
        <p className="mt-2 text-center text-[clamp(0.8rem,1.8vw,0.95rem)] text-[#a1a1aa]">{t("lead")}</p>

        <p className="mt-6 text-xs font-medium tracking-[0.08em] text-[#6ee7b7]">{t("networkHeading")}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:gap-3">
          {TIERS.map((tier) => (
            <article key={tier} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4">
              <h3 className="text-sm font-medium tracking-[0.08em] text-[#89b7d6]">{t(tier)}</h3>
              <p className="mt-1 text-[clamp(0.75rem,1.6vw,0.9rem)] leading-snug text-[#d4d4d8]">
                {tier === "standard" ? t("standardLine") : slides("global-pro.line2")}
              </p>
              <ul className="mt-4 space-y-3">
                {rows.map((row) => (
                  <li key={row.id}>
                    <p className="text-xs text-[#a1a1aa]">
                      {t(row.id)} · {t("traffic", { gb: row[tier].trafficGb })}
                    </p>
                    <p className="mt-0.5 font-mono text-[clamp(1.05rem,2.2vw,1.35rem)] text-[#f4f4f5]">
                      {formatPrimaryPrice(locale, row[tier].prices)}
                    </p>
                  </li>
                ))}
              </ul>
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
      </div>
    </div>
  );
}
