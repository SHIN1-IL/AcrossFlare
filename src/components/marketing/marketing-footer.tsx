import { getTranslations } from "next-intl/server";
import { MerchantDisclosure } from "@/components/marketing/merchant-disclosure";
import { LegalFooterLinks } from "@/components/marketing/legal-footer-links";
import { Logo } from "@/components/marketing/logo";

const COPYRIGHT_YEAR = new Date().getFullYear();

export async function MarketingFooter({
  snap = false,
  compact = false,
}: {
  snap?: boolean;
  compact?: boolean;
}) {
  const t = await getTranslations("footer");

  return (
    <footer
      data-home-page={snap ? "" : undefined}
      className={
        compact
          ? "max-h-[32dvh] shrink-0 overflow-y-auto bg-[#0c1116]"
          : snap
            ? "h-dvh snap-center snap-always overflow-y-auto border-t border-border pt-14 max-md:snap-start"
            : "border-t border-border"
      }
    >
      <div
        className={
          compact
            ? "mx-auto flex max-w-6xl flex-col gap-1 px-4 py-1.5"
            : "mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10"
        }
      >
        <div
          className={
            compact
              ? "flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
              : "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          }
        >
          <div className={compact ? "flex items-center gap-2" : "flex items-center gap-3"}>
            <Logo markClassName={compact ? "size-6" : undefined} />
            <span className={compact ? "text-[10px] text-muted-foreground" : "text-sm text-muted-foreground"}>
              {t("copyright", { year: COPYRIGHT_YEAR })}
            </span>
          </div>
          <LegalFooterLinks className={compact ? "gap-2 text-[10px]" : "text-sm"} />
        </div>
        <MerchantDisclosure compact={compact} />
      </div>
    </footer>
  );
}
