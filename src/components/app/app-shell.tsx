"use client";

import { CreditCard, Globe, HardDrive, Layers, LayoutGrid, LogOut, Menu, Settings2, Waypoints, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { LegalFooterLinks } from "@/components/marketing/legal-footer-links";
import { LocaleSwitcher } from "@/components/marketing/locale-switcher";
import { Logo } from "@/components/marketing/logo";
import { buttonVariants } from "@/components/ui/button";
import { useAccount, useHydrated } from "@/hooks/use-account";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { publicServiceFromPlanId } from "@/lib/public-service";
import { clearSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const BASE_NAV = [
  { href: "/app", key: "overview", icon: LayoutGrid },
  { href: "/dashboard", key: "backup", icon: HardDrive },
  { href: "/app/global", key: "network", icon: Globe },
  { href: "/app/workspace", key: "workspace", icon: Layers },
  { href: "/app/billing", key: "billing", icon: CreditCard },
  { href: "/app/settings", key: "settings", icon: Settings2 },
] as const;

function NavLinks({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const t = useTranslations("app");
  const pathname = usePathname();
  const { account } = useAccount();
  const networkKey = publicServiceFromPlanId(account?.global?.planId) === "hybrid" ? "hybrid" : "standard";
  const items = [
    ...BASE_NAV.slice(0, 4),
    ...(account?.marketing
      ? ([{ href: "/app/marketing", key: "marketing", icon: Waypoints }] as const)
      : []),
    ...BASE_NAV.slice(4),
  ];

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active =
          item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
        const Icon = item.icon;
        const label = item.key === "network" ? t(networkKey) : t(item.key);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  merchant,
}: {
  children: React.ReactNode;
  merchant?: React.ReactNode;
}) {
  const t = useTranslations("app");
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const { session } = useAccount();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hydrated && !session) {
      router.replace({
        pathname: "/login",
        query: { next: pathname },
      });
    }
  }, [hydrated, pathname, router, session]);

  if (!hydrated || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-pulse rounded-full bg-primary/20" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface px-3 py-4 md:flex">
        <div className="px-2 pb-6">
          <Logo />
        </div>
        <NavLinks />
        <div className="mt-auto space-y-3 px-1 pt-6">
          <LocaleSwitcher />
          <p className="truncate font-mono text-[11px] text-muted-foreground">{session.email}</p>
          <button
            type="button"
            onClick={() => {
              void clearSession().then(() => {
                router.replace("/");
                router.refresh();
              });
            }}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="size-4" />
            {t("logout")}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <Logo />
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }), "rounded-[10px]")}
            aria-label="Menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </header>
        {open ? (
          <div className="space-y-4 border-b border-border px-4 py-3 md:hidden">
            <NavLinks onNavigate={() => setOpen(false)} />
            <LocaleSwitcher />
            <button
              type="button"
              onClick={() => {
                void clearSession().then(() => {
                  router.replace("/");
                  router.refresh();
                });
              }}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground"
            >
              <LogOut className="size-4" />
              {t("logout")}
            </button>
          </div>
        ) : null}
        <main className="flex-1 px-4 py-8 md:px-8">{children}</main>
        {merchant ? (
          <footer className="border-t border-border px-4 py-6 md:px-8">
            <LegalFooterLinks className="text-xs" />
            <div className="mt-6">{merchant}</div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
