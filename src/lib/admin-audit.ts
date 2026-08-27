import { Prisma } from "@prisma/client";
import type { AuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function writeAdminAudit(input: {
  actor: Pick<AuthUser, "id" | "email">;
  action: string;
  targetType: string;
  targetId: string;
  meta?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        actorId: input.actor.id,
        actorEmail: input.actor.email,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        meta: input.meta,
      },
    });
  } catch (error) {
    console.error("admin_audit_failed", error);
  }
}
