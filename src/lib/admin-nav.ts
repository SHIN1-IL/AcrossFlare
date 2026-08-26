import type { AdminPermission } from "@/lib/admin-permissions";
import type { ProductId } from "@/lib/plans";

export const ADMIN_TAB_PRODUCTS = ["global", "workspace"] as const satisfies readonly ProductId[];

export type AdminTabProduct = (typeof ADMIN_TAB_PRODUCTS)[number];

export function adminTabMessageKey(product: ProductId) {
  if (product === "workspace") {
    return "tabWorkspace" as const;
  }
  if (product === "marketing") {
    return "tabMarketing" as const;
  }
  return "tabGlobal" as const;
}

export function adminHomeDescKey(product: ProductId) {
  if (product === "workspace") {
    return "homeWorkspaceDesc" as const;
  }
  if (product === "marketing") {
    return "homeMarketingDesc" as const;
  }
  return "homeGlobalDesc" as const;
}

export function productHasBackup(product: ProductId) {
  return product === "global" || product === "workspace";
}

export function adminNavItems(product: ProductId, permissions?: readonly AdminPermission[]) {
  const items = [
    { suffix: "customers" as const, key: "navCustomers" as const },
    { suffix: "plans" as const, key: "navPlans" as const },
    { suffix: "codes" as const, key: "navCodes" as const },
    { suffix: "provision" as const, key: "navProvision" as const },
    { suffix: "nodes" as const, key: "navNodes" as const },
  ];

  const scoped = product === "workspace" ? items : items.filter((item) => item.suffix !== "codes");
  if (!permissions) {
    return scoped;
  }

  const allowed = new Set(permissions);
  return scoped.filter((item) => allowed.has(item.suffix));
}

export function firstAdminPath(
  product: ProductId,
  permissions: readonly AdminPermission[],
  owner = false
) {
  const item = adminNavItems(product, permissions)[0];
  if (item) {
    return `/admin/${product}/${item.suffix}`;
  }

  if (owner) {
    return "/admin/staff";
  }

  return "/admin";
}
