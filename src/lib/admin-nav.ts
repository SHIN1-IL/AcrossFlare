import type { AdminPermission } from "@/lib/admin-permissions";
import {
  ADMIN_SERVICES,
  adminHomeDescKey,
  adminTabMessageKey,
  type AdminServiceId,
} from "@/lib/admin-service";
import type { ProductId } from "@/lib/plans";

export { ADMIN_SERVICES, adminHomeDescKey, adminTabMessageKey };
export type { AdminServiceId };

export const ADMIN_TAB_PRODUCTS = ADMIN_SERVICES;

export type AdminTabProduct = AdminServiceId;

export function productHasBackup(product: ProductId | AdminServiceId) {
  return product !== "marketing";
}

export function adminNavItems(service: AdminServiceId, permissions?: readonly AdminPermission[]) {
  const items = [
    { suffix: "customers" as const, key: "navCustomers" as const },
    { suffix: "plans" as const, key: "navPlans" as const },
    { suffix: "codes" as const, key: "navCodes" as const },
    { suffix: "provision" as const, key: "navProvision" as const },
    { suffix: "nodes" as const, key: "navNodes" as const },
  ];

  const scoped = service === "workspace" ? items : items.filter((item) => item.suffix !== "codes");
  if (!permissions) {
    return scoped;
  }

  const allowed = new Set(permissions);
  return scoped.filter((item) => allowed.has(item.suffix));
}

export function firstAdminPath(
  service: AdminServiceId,
  permissions: readonly AdminPermission[],
  owner = false
) {
  const item = adminNavItems(service, permissions)[0];
  if (item) {
    return `/admin/${service}/${item.suffix}`;
  }

  if (owner) {
    return "/admin/staff";
  }

  return "/admin";
}
