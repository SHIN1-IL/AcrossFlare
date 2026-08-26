import type { AdminPermission } from "@/lib/admin-permissions";
import { isAdminRole, isOwnerRole } from "@/lib/admin-permissions";

export type UserRole = "USER" | "ADMIN" | "OWNER" | "STAFF";

export type PublicSession = {
  email: string;
  role: UserRole;
  permissions: AdminPermission[];
};

export function isAdminSession(session: PublicSession | null | undefined) {
  return isAdminRole(session?.role);
}

export function isOwnerSession(session: PublicSession | null | undefined) {
  return isOwnerRole(session?.role);
}

export function toPublicSession(user: {
  email: string;
  role: UserRole;
  permissions: AdminPermission[];
}): PublicSession {
  return {
    email: user.email,
    role: user.role,
    permissions: user.permissions,
  };
}
