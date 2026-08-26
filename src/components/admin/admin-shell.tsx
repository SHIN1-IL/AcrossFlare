"use client";

import { LayoutGrid, LogOut, Menu, Server, Shield, Ticket, Users, Wallet, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { AdminTabSwitch } from "@/components/admin/admin-tab-switch";
import { LocaleSwitcher } from "@/components/marketing/locale-switcher";
import { Logo } from "@/components/marketing/logo";
import { buttonVariants } from "@/components/ui/button";
import { useHydrated, useSession } from "@/hooks/use-account";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { isAdminSession, isOwnerSession } from "@/lib/auth-types";
import { adminNavItems } from "@/lib/admin-nav";
import { canonicalAdminService, type AdminServiceId } from "@/lib/admin-service";
import type { AdminPermission } from "@/lib/admin-permissions";
import { clearSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const NAV_ICONS = {
  customers: Users,
  plans: Wallet,
  codes: Ticket,
  provision: LayoutGrid,
  nodes: Server,
} as const;

function serviceFromPath(pathname: string): AdminServiceId {
  const part = pathname.split("/").find((item) => canonicalAdminService(item));
  return canonicalAdminService(part) ?? "standard";
}

function SessionRole({ owner, className }: { owner: boolean; className?: string }) {
  const t = useTranslations("admin");
  return (
    <p className={cn("font-mono text-[11px] tracking-[0.16em] text-primary uppercase", className)}>
      {owner ? t("sessionRoleOwner") : t("sessionRoleStaff")}
    </p>
  );
}

function SessionIdentity({ email, owner }: { email: string; owner: boolean }) {
  return (
    <div className="space-y-1">
      <SessionRole owner={owner} className="px-0 tracking-[0.12em]" />
      <p className="truncate font-mono text-[11px] text-muted-foreground">{email}</p>
    </div>
  );
}

function NavLinks({
  product,
  permissions,
  owner,
  onNavigate,
}: {
  product: AdminServiceId;
  permissions: AdminPermission[];
  owner: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const staffHref = "/admin/staff";
  const staffActive = pathname === staffHref || pathname.startsWith(`${staffHref}/`);

  return (
    <nav className="space-y-1">
      {adminNavItems(product, permissions).map((item) => {
        const href = `/admin/${product}/${item.suffix}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const Icon = NAV_ICONS[item.suffix];

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
      {owner ? (
        <Link
          href={staffHref}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm transition-colors",
            staffActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          )}
        >
          <Shield className="size-4" />
          {t("navStaff")}
        </Link>
      ) : null}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const tApp = useTranslations("app");
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const session = useSession();
  const [open, setOpen] = useState(false);
  const product = serviceFromPath(pathname);
  const permissions = session?.permissions ?? [];
  const owner = isOwnerSession(session);

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
          <SessionRole owner={owner} className="px-2" />
          <AdminTabSwitch />
        </div>
        <NavLinks product={product} permissions={permissions} owner={owner} />
        <div className="mt-auto space-y-3 px-1 pt-6">
          <LocaleSwitcher />
          <SessionIdentity email={session.email} owner={owner} />
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
          <div className="min-w-0">
            <Logo />
            <SessionRole owner={owner} className="mt-1" />
          </div>
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
            <NavLinks product={product} permissions={permissions} owner={owner} onNavigate={() => setOpen(false)} />
            <LocaleSwitcher />
            <SessionIdentity email={session.email} owner={owner} />
          </div>
        ) : null}
        <main className="flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
