import { Product, SubscriptionStatus } from "@prisma/client";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BackupStorageError } from "@/lib/backup-storage";
import { syncthingFolderId } from "@/lib/provision/build";

export async function requireBackupAccess() {
  const user = await getAuthUser();
  if (!user) {
    throw new BackupStorageError("unauthorized", 401);
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
      product: Product.GLOBAL,
      status: SubscriptionStatus.ACTIVE,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      backupUsedGb: true,
      plan: { select: { backupGb: true } },
      credentials: { select: { syncthingFolderId: true } },
    },
  });

  let folderId = subscription?.credentials?.syncthingFolderId ?? "";
  if (subscription?.credentials && !folderId) {
    folderId = syncthingFolderId(subscription.id);
    await prisma.credential.update({
      where: { subscriptionId: subscription.id },
      data: { syncthingFolderId: folderId },
    });
  }
  const quotaGb = subscription?.plan.backupGb;
  if (!subscription || !folderId || !quotaGb || quotaGb <= 0) {
    throw new BackupStorageError("backup_unavailable", 403);
  }

  return {
    subscriptionId: subscription.id,
    folderId,
    quotaBytes: quotaGb * 1024 * 1024 * 1024,
  };
}

export async function updateBackupUsage(subscriptionId: string, usedBytes: number) {
  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: { backupUsedGb: usedBytes / (1024 * 1024 * 1024) },
  });
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return;
  }
  if (origin !== new URL(request.url).origin) {
    throw new BackupStorageError("origin_forbidden", 403);
  }
}
