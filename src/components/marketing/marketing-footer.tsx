import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MerchantDisclosure } from "@/components/marketing/merchant-disclosure";
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
          <nav className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <Link href="/terms" className="transition-colors hover:text-foreground">
              {t("terms")}
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">
              {t("privacy")}
            </Link>
            <Link
              href={{ pathname: "/terms", hash: "refund" }}
              className="transition-colors hover:text-foreground"
            >
              {t("refund")}
            </Link>
          </nav>
        </div>
        <MerchantDisclosure />
      </div>
    </footer>
  );
}
