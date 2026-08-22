"use client";

import { LayoutGrid, LogOut, Menu, Server, Users, Wallet, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AdminTabSwitch } from "@/components/admin/admin-tab-switch";
import { LocaleSwitcher } from "@/components/marketing/locale-switcher";
import { Logo } from "@/components/marketing/logo";
import { buttonVariants } from "@/components/ui/button";
import { useHydrated, useSession } from "@/hooks/use-account";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { isAdminSession } from "@/lib/auth-types";
import { isProductId, type ProductId } from "@/lib/plans";
import { clearSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const NAV = [
  { suffix: "customers", key: "navCustomers", icon: Users },
  { suffix: "plans", key: "navPlans", icon: Wallet },
  { suffix: "provision", key: "navProvision", icon: LayoutGrid },
  { suffix: "nodes", key: "navNodes", icon: Server },
] as const;

function productFromPath(pathname: string): ProductId {
  const part = pathname.split("/").find((item) => isProductId(item));
  return part ?? "global";
}

function NavLinks({
  product,
  onNavigate,
}: {
  product: ProductId;
  onNavigate?: () => void;
}) {
  const t = useTranslations("admin");
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const href = `/admin/${product}/${item.suffix}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.suffix}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin");
  const tApp = useTranslations("app");
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const product = productFromPath(pathname);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!session) {
      router.replace({
        pathname: "/login",
        query: { next: pathname },
      });
      return;
    }

    if (!isAdminSession(session)) {
      router.replace("/app");
    }
  }, [hydrated, pathname, router, session]);

  if (!hydrated || !session || !isAdminSession(session)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-pulse rounded-full bg-primary/20" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface px-3 py-4 md:flex">
        <div className="space-y-4 px-1 pb-4">
          <Logo />
          <p className="px-2 font-mono text-[11px] tracking-[0.16em] text-primary uppercase">{t("mode")}</p>
          <AdminTabSwitch />
        </div>
        <NavLinks product={product} />
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
            {tApp("logout")}
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
            <AdminTabSwitch />
            <NavLinks product={product} onNavigate={() => setOpen(false)} />
            <LocaleSwitcher />
          </div>
        ) : null}
        <main className="flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
