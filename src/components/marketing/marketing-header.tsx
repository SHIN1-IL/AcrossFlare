"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/marketing/locale-switcher";
import { Logo } from "@/components/marketing/logo";
import { useHydrated, useSession } from "@/hooks/use-account";
import { cn } from "@/lib/utils";

export function MarketingHeader() {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();
  const session = useSession();
  const signedIn = hydrated && Boolean(session);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Logo />

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <Link href="/#products" className="transition-colors hover:text-foreground">
            {t("product")}
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-foreground">
            {t("pricing")}
          </Link>
          <span
            title={tCommon("docsSoon")}
            className="cursor-not-allowed text-muted-foreground/50"
          >
            {t("docs")}
          </span>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LocaleSwitcher />
          {signedIn ? (
            <Link
              href="/app"
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
                {t("getStarted")}
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
          <Link href="/#products" onClick={() => setOpen(false)} className="block text-sm">
            {t("product")}
          </Link>
          <Link href="/pricing" onClick={() => setOpen(false)} className="block text-sm">
            {t("pricing")}
          </Link>
          <p className="text-sm text-muted-foreground/50">{t("docs")}</p>
          <LocaleSwitcher />
          {signedIn ? (
            <Link
              href="/app"
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
                {t("getStarted")}
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </header>
  );
}
