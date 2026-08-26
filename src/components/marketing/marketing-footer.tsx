import { getTranslations } from "next-intl/server";
import { MerchantDisclosure } from "@/components/marketing/merchant-disclosure";
import { LegalFooterLinks } from "@/components/marketing/legal-footer-links";
import { Logo } from "@/components/marketing/logo";

export async function MarketingFooter() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-sm text-muted-foreground">{t("copyright", { year: new Date().getFullYear() })}</span>
          </div>
          <LegalFooterLinks className="text-sm" />
        </div>
        <MerchantDisclosure />
      </div>
    </footer>
  );
}
