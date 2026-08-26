"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useSession } from "@/hooks/use-account";
import { isOwnerSession } from "@/lib/auth-types";
import { ADMIN_TAB_PRODUCTS, adminTabMessageKey, firstAdminPath } from "@/lib/admin-nav";
import type { AdminPermission } from "@/lib/admin-permissions";
import { isProductId, type ProductId } from "@/lib/plans";
import { cn } from "@/lib/utils";

function productFromPath(pathname: string): ProductId {
  const part = pathname.split("/").find((item) => isProductId(item));
  return part ?? "global";
}

function switchedHref(
  pathname: string,
  next: ProductId,
  permissions: AdminPermission[],
  owner: boolean
) {
  const current = productFromPath(pathname);
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

  const swapped = pathname.replace(`/admin/${current}`, `/admin/${next}`);
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
  const current = productFromPath(pathname);
  const permissions = session?.permissions ?? [];
  const owner = isOwnerSession(session);

  return (
    <div className="grid grid-cols-2 gap-1 rounded-[10px] bg-surface-2 p-1">
      {ADMIN_TAB_PRODUCTS.map((product) => {
        const active = current === product;
        return (
          <Link
            key={product}
            href={switchedHref(pathname, product, permissions, owner)}
            className={cn(
              "rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors",
              active ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t(adminTabMessageKey(product))}
          </Link>
        );
      })}
    </div>
  );
}
