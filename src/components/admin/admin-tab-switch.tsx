"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { isProductId, type ProductId } from "@/lib/plans";
import { cn } from "@/lib/utils";

function productFromPath(pathname: string): ProductId {
  const part = pathname.split("/").find((item) => isProductId(item));
  return part ?? "global";
}

function switchedHref(pathname: string, next: ProductId) {
  const current = productFromPath(pathname);

  if (pathname === "/admin") {
    return `/admin/${next}/customers`;
  }

  if (pathname.includes("/customers/")) {
    return `/admin/${next}/customers`;
  }

  return pathname.replace(`/admin/${current}`, `/admin/${next}`);
}

export function AdminTabSwitch() {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const current = productFromPath(pathname);

  return (
    <div className="grid grid-cols-2 gap-1 rounded-[10px] bg-surface-2 p-1">
      {(["global", "marketing"] as const).map((product) => {
        const active = current === product;
        return (
          <Link
            key={product}
            href={switchedHref(pathname, product)}
            className={cn(
              "rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors",
              active ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {product === "global" ? t("tabGlobal") : t("tabMarketing")}
          </Link>
        );
      })}
    </div>
  );
}
