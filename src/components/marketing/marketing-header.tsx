"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/marketing/locale-switcher";
import { Logo } from "@/components/marketing/logo";
import { ServiceNav } from "@/components/marketing/service-nav";
import { useHydrated, useSession } from "@/hooks/use-account";
import { signedInHomeHref } from "@/lib/auth-types";
import { cn } from "@/lib/utils";

export function MarketingHeader() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  const session = useSession();
  const signedIn = hydrated && Boolean(session);
  const consoleHref = signedInHomeHref(session);

  return (
    <header className="sticky top-0 z-40 bg-transparent">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Logo showWordmark={false} />
          <div className="hidden md:block">
            <ServiceNav />
          </div>
          <div className="hidden md:block">
            <LocaleSwitcher />
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {signedIn ? (
            <Link
              href={consoleHref}
              className={cn(buttonVariants({ size: "sm" }), "rounded-[10px]")}
            >
              {t("console")}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-[10px]")}
              >
                {t("login")}
              </Link>
              <Link
                href="/signup"
                className={cn(buttonVariants({ size: "sm" }), "rounded-[10px]")}
              >
                {t("signup")}
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-[10px] border border-border md:hidden"
          aria-label="Menu"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open ? (
        <div className="space-y-3 border-t border-border px-4 py-3 md:hidden">
          <ServiceNav onNavigate={() => setOpen(false)} />
          <LocaleSwitcher />
          {signedIn ? (
            <Link
              href={consoleHref}
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ size: "sm" }), "w-full rounded-[10px]")}
            >
              {t("console")}
            </Link>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1 rounded-[10px]")}
              >
                {t("login")}
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className={cn(buttonVariants({ size: "sm" }), "flex-1 rounded-[10px]")}
              >
                {t("signup")}
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </header>
  );
}
