import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { isOwnerEmail, permissionsFor } from "@/lib/admin-permissions";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  SIGNED_IN_COOKIE,
  SIGNED_IN_COOKIE_VALUE,
  sessionCookieOptions,
} from "@/lib/auth-cookies";
import { toPublicSession, type PublicSession, type UserRole } from "@/lib/auth-types";
import type { AdminPermission } from "@/lib/admin-permissions";

export {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  SIGNED_IN_COOKIE,
  SIGNED_IN_COOKIE_VALUE,
} from "@/lib/auth-cookies";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  permissions: AdminPermission[];
};

type UserAuthRow = {
  id: string;
  email: string;
  role: UserRole;
  staffPermissions: string[];
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionToken() {
  return randomBytes(32).toString("hex");
}

export async function createSession(userId: string) {
  const token = createSessionToken();

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  return token;
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  const base = sessionCookieOptions();
  cookieStore.set(SESSION_COOKIE, token, { ...base, httpOnly: true });
  cookieStore.set(SIGNED_IN_COOKIE, SIGNED_IN_COOKIE_VALUE, { ...base, httpOnly: false });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete({ name: SESSION_COOKIE, path: "/" });
  cookieStore.delete({ name: SIGNED_IN_COOKIE, path: "/" });
}

export async function destroySession(token?: string | null) {
  if (token) {
    await prisma.session.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }

  await clearSessionCookie();
}

export async function materializeAuthUser(row: UserAuthRow): Promise<AuthUser> {
  let { id, email, role, staffPermissions } = row;

  if (isOwnerEmail(email) && role !== "OWNER") {
    const updated = await prisma.user.update({
      where: { id },
      data: { role: "OWNER", staffPermissions: [] },
      select: { role: true, staffPermissions: true },
    });
    role = updated.role;
    staffPermissions = updated.staffPermissions;
  }

  return {
    id,
    email,
    role,
    permissions: permissionsFor(role, staffPermissions),
  };
}

export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: { id: true, email: true, role: true, staffPermissions: true },
      },
    },
  });

  if (!session || session.expiresAt.getTime() <= Date.now()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    }
    return null;
  }

  return materializeAuthUser(session.user);
});

export const getCurrentUser = cache(async (): Promise<PublicSession | null> => {
  const user = await getAuthUser();
  if (!user) {
    return null;
  }

  return toPublicSession(user);
});
