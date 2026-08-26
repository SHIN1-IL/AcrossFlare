import { NextResponse } from "next/server";
import { getAuthUser, type AuthUser } from "@/lib/auth";
import {
  isAdminRole,
  isOwnerRole,
  type AdminPermission,
} from "@/lib/admin-permissions";
import { redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export async function requireAdmin(): Promise<{ user: AuthUser } | { response: NextResponse }> {
  const user = await getAuthUser();
  if (!user) {
    return { response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }

  if (!isAdminRole(user.role)) {
    return { response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }

  return { user };
}

export async function requireOwner(): Promise<{ user: AuthUser } | { response: NextResponse }> {
  const auth = await requireAdmin();
  if ("response" in auth) {
    return auth;
  }

  if (!isOwnerRole(auth.user.role)) {
    return { response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }

  return auth;
}

export async function requirePermission(
  permission: AdminPermission
): Promise<{ user: AuthUser } | { response: NextResponse }> {
  const auth = await requireAdmin();
  if ("response" in auth) {
    return auth;
  }

  if (!auth.user.permissions.includes(permission)) {
    return { response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }

  return auth;
}

export async function requireAdminPage(
  locale: AppLocale,
  permission?: AdminPermission | "owner"
): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    redirect({ href: { pathname: "/login", query: { next: "/admin" } }, locale });
    throw new Error("unauthorized");
  }
  if (!isAdminRole(user.role)) {
    redirect({ href: "/app", locale });
    throw new Error("forbidden");
  }
  if (permission === "owner" && !isOwnerRole(user.role)) {
    redirect({ href: "/admin", locale });
    throw new Error("forbidden");
  }
  if (permission && permission !== "owner" && !user.permissions.includes(permission)) {
    redirect({ href: "/admin", locale });
    throw new Error("forbidden");
  }
  return user;
}
