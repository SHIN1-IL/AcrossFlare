import type { AdminPermission } from "@/lib/admin-permissions";
import { isAdminRole, isOwnerRole } from "@/lib/admin-permissions";
import { stripLocalePrefix } from "@/i18n/path";

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

export function signedInHomeHref(session: PublicSession | null | undefined) {
  return isAdminSession(session) ? "/admin" : "/app";
}

export function afterLoginHref(session: PublicSession | null | undefined) {
  return isAdminSession(session) ? "/admin" : "/";
}

export function isSafeNextPath(value: string | null | undefined): value is string {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}

function pathnameOf(path: string) {
  return path.split("?")[0] ?? path;
}

function unprefixedPath(path: string) {
  const [pathname, search] = path.split("?");
  const stripped = stripLocalePrefix(pathnameOf(pathname));
  return search ? `${stripped}?${search}` : stripped;
}

function isConsoleReturnPath(path: string) {
  const pathname = stripLocalePrefix(pathnameOf(path));
  return (
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard")
  );
}

function isAdminReturnPath(path: string) {
  const pathname = stripLocalePrefix(pathnameOf(path));
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** Where to send a user after email login. Console `next=/app` is ignored for customers. */
export function loginRedirectHref(session: PublicSession, next?: string | null) {
  if (isAdminSession(session)) {
    if (isSafeNextPath(next) && isAdminReturnPath(next)) {
      return unprefixedPath(next);
    }
    return "/admin";
  }

  if (isSafeNextPath(next) && !isConsoleReturnPath(next)) {
    return unprefixedPath(next);
  }

  return "/";
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
