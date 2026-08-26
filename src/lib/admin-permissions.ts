import { normalizeEmail } from "@/lib/email";

export const ADMIN_PERMISSIONS = ["customers", "plans", "codes", "provision", "nodes"] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const DEFAULT_STAFF_PERMISSIONS: AdminPermission[] = ["customers", "codes", "provision"];

export type AdminPanelRole = "USER" | "ADMIN" | "OWNER" | "STAFF";

export function ownerEmail() {
  const raw = (process.env.ADMIN_OWNER_EMAIL || process.env.LEGAL_EMAIL || "acrosstool@gmail.com").trim();
  return normalizeEmail(raw);
}

export function isOwnerEmail(email: string) {
  return normalizeEmail(email) === ownerEmail();
}

export function isAdminRole(role: string | null | undefined) {
  return role === "ADMIN" || role === "OWNER" || role === "STAFF";
}

export function isOwnerRole(role: string | null | undefined) {
  return role === "OWNER" || role === "ADMIN";
}

export function parseStaffPermissions(values: unknown): AdminPermission[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const allowed = new Set<string>(ADMIN_PERMISSIONS);
  const unique = new Set<AdminPermission>();
  for (const value of values) {
    if (typeof value === "string" && allowed.has(value)) {
      unique.add(value as AdminPermission);
    }
  }

  return ADMIN_PERMISSIONS.filter((permission) => unique.has(permission));
}

export function permissionsFor(role: string, staffPermissions: string[] = []): AdminPermission[] {
  if (isOwnerRole(role)) {
    return [...ADMIN_PERMISSIONS];
  }

  if (role === "STAFF") {
    return parseStaffPermissions(staffPermissions);
  }

  return [];
}

export function hasPermission(
  role: string,
  staffPermissions: string[] | undefined,
  permission: AdminPermission
) {
  return permissionsFor(role, staffPermissions).includes(permission);
}

export function filterAdminState<
  T extends {
    plans: unknown[];
    nodes: unknown[];
    customers: unknown[];
    promoCodes: unknown[];
  },
>(state: T, permissions: readonly AdminPermission[]): T {
  const canPlans =
    permissions.includes("plans") ||
    permissions.includes("customers") ||
    permissions.includes("provision") ||
    permissions.includes("codes");

  return {
    ...state,
    plans: canPlans ? state.plans : [],
    customers: permissions.includes("customers") ? state.customers : [],
    nodes: permissions.includes("nodes") ? state.nodes : [],
    promoCodes: permissions.includes("codes") ? state.promoCodes : [],
  };
}
