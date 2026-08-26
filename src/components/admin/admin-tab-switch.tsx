"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSession } from "@/hooks/use-account";
import { isOwnerSession } from "@/lib/auth-types";
import { ADMIN_TAB_PRODUCTS, adminTabMessageKey, firstAdminPath } from "@/lib/admin-nav";
import { canonicalAdminService, type AdminServiceId } from "@/lib/admin-service";
import type { AdminPermission } from "@/lib/admin-permissions";
import { cn } from "@/lib/utils";

function segmentFromPath(pathname: string) {
  return pathname.split("/").find((item) => canonicalAdminService(item)) ?? "standard";
}

function serviceFromPath(pathname: string): AdminServiceId {
  return canonicalAdminService(segmentFromPath(pathname)) ?? "standard";
}

function switchedHref(
  pathname: string,
  next: AdminServiceId,
  permissions: AdminPermission[],
  owner: boolean
) {
  const currentSegment = segmentFromPath(pathname);
  const fallback = firstAdminPath(next, permissions, owner);

  if (pathname === "/admin" || pathname === "/admin/staff") {
    return fallback;
  }

  if (pathname.includes("/customers/")) {
    return permissions.includes("customers") ? `/admin/${next}/customers` : fallback;
  }

  if (next !== "workspace" && pathname.includes("/codes")) {
    return fallback;
  }

  const swapped = pathname.replace(`/admin/${currentSegment}`, `/admin/${next}`);
  const suffix = swapped.split("/")[3];
  if (
    suffix &&
    suffix !== "staff" &&
    !permissions.includes(suffix as AdminPermission)
  ) {
    return fallback;
  }

  return swapped;
}

export function AdminTabSwitch() {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const session = useSession();
  const onServiceRoute = pathname.startsWith("/admin/") && pathname !== "/admin/staff";
  const current = onServiceRoute ? serviceFromPath(pathname) : null;
  const permissions = session?.permissions ?? [];
  const owner = isOwnerSession(session);

  return (
    <div className="grid grid-cols-3 gap-1 rounded-[10px] bg-surface-2 p-1">
      {ADMIN_TAB_PRODUCTS.map((service) => {
        const active = current === service;
        return (
          <Link
            key={service}
            href={switchedHref(pathname, service, permissions, owner)}
            className={cn(
              "rounded-md px-1 py-1.5 text-center text-[11px] font-medium transition-colors sm:px-2 sm:text-xs",
              active ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t(adminTabMessageKey(service))}
          </Link>
        );
      })}
    </div>
  );
}
