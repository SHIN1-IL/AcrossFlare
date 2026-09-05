"use client";

import { useLocale, useTranslations } from "next-intl";
import { localePath } from "@/i18n/path";
import { buttonVariants } from "@/components/ui/button";
import {
  CachedMarketingLink,
  DocumentLink,
} from "@/components/marketing/cached-marketing-link";
import { LocaleSwitcher } from "@/components/marketing/locale-switcher";
import { Logo } from "@/components/marketing/logo";
import { ServiceNav } from "@/components/marketing/service-nav";
import { SupportNav } from "@/components/marketing/support-nav";
import { useHydrated, useSession, useSignedInFlag } from "@/hooks/use-account";
import { signedInHomeHref } from "@/lib/auth-types";
import { clearSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export function MarketingHeader() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const hydrated = useHydrated();
  const session = useSession();
  const signedInFlag = useSignedInFlag();
  const signedIn = hydrated && (Boolean(session) || signedInFlag);
  const consoleHref = signedInHomeHref(session);

  function logout() {
    void clearSession().then(() => {
      window.location.assign(localePath(locale, "/"));
    });
  }

  return (
    <header className="sticky top-0 z-40 bg-transparent">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5 md:gap-4">
          <Logo showWordmark={false} />
          <ServiceNav />
          {signedIn ? <SupportNav /> : null}
          <LocaleSwitcher />
        </div>

        <div className="flex shrink-0 items-center gap-1 md:gap-2">
          {signedIn ? (
            <>
              <button
                type="button"
                onClick={logout}
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "rounded-[10px] px-2 md:px-2.5"
                )}
              >
                {t("logout")}
              </button>
              <DocumentLink
                href={consoleHref}
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "rounded-[10px] px-2 md:px-2.5"
                )}
              >
                {t("console")}
              </DocumentLink>
            </>
          ) : (
            <>
              <CachedMarketingLink
                href="/login"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "rounded-[10px] px-2 md:px-2.5"
                )}
              >
                {t("login")}
              </CachedMarketingLink>
              <CachedMarketingLink
                href="/signup"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "rounded-[10px] px-2 md:px-2.5"
                )}
              >
                {t("signup")}
              </CachedMarketingLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
