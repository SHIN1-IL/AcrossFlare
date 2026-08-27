import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/admin-auth";
import { writeAdminAudit } from "@/lib/admin-audit";
import {
  DEFAULT_STAFF_PERMISSIONS,
  isOwnerEmail,
  isOwnerRole,
  ownerEmail,
  parseStaffPermissions,
  permissionsFor,
} from "@/lib/admin-permissions";
import { prisma } from "@/lib/db";

function toStaffUser(row: {
  id: string;
  email: string;
  role: "USER" | "STAFF";
  staffPermissions: string[];
  createdAt: Date;
}) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    permissions: row.role === "STAFF" ? permissionsFor(row.role, row.staffPermissions) : [],
    createdAt: row.createdAt.toISOString(),
  };
}

export async function GET() {
  const auth = await requireOwner();
  if ("response" in auth) {
    return auth.response;
  }

  const users = await prisma.user.findMany({
    where: { role: { in: ["USER", "STAFF"] } },
    select: { id: true, email: true, role: true, staffPermissions: true, createdAt: true },
    orderBy: { email: "asc" },
  });

  const staff = users
    .filter((user): user is typeof user & { role: "USER" | "STAFF" } => user.role === "USER" || user.role === "STAFF")
    .sort((a, b) => Number(b.role === "STAFF") - Number(a.role === "STAFF"))
    .map(toStaffUser);

  return NextResponse.json({
    ownerEmail: ownerEmail(),
    staff,
  });
}

export async function PATCH(request: Request) {
  const auth = await requireOwner();
  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as
    | { id?: string; role?: string; permissions?: unknown }
    | null;

  if (!body?.id || (body.role !== "STAFF" && body.role !== "USER")) {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: body.id },
    select: { id: true, email: true, role: true, staffPermissions: true },
  });

  if (!target) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (isOwnerRole(target.role) || isOwnerEmail(target.email) || target.id === auth.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const staffPermissions =
    body.role === "USER"
      ? []
      : body.permissions !== undefined
        ? parseStaffPermissions(body.permissions)
        : target.role === "STAFF"
          ? parseStaffPermissions(target.staffPermissions)
          : DEFAULT_STAFF_PERMISSIONS;

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: {
      role: body.role,
      staffPermissions,
    },
    select: { id: true, email: true, role: true, staffPermissions: true, createdAt: true },
  });

  if (updated.role !== "USER" && updated.role !== "STAFF") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await writeAdminAudit({
    actor: auth.user,
    action: "staff_update",
    targetType: "user",
    targetId: updated.id,
    meta: { role: updated.role, permissions: staffPermissions },
  });

  return NextResponse.json({
    staff: toStaffUser({ ...updated, role: updated.role }),
  });
}
