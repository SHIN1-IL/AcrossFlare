import { NodeHealth, Product, SubscriptionStatus, type Credential, type Node, type Plan, type Subscription } from "@prisma/client";
import { loadAccountSnapshot } from "@/lib/account-from-db";
import { prisma } from "@/lib/db";
import { rotateCooldownMs } from "@/lib/marketing/config";
import {
  exitHostFor,
  issueMarketingSecrets,
  nextExitIp,
  pickNextNode,
  regionFrom,
} from "@/lib/marketing/secrets";
import { isProvisionSimulate } from "@/lib/provision/config";
import { addXuiClient } from "@/lib/provision/xui";

type MarketingSubscription = Subscription & {
  plan: Plan;
  nodes: Node[];
  credentials: Credential;
};

export class RotateError extends Error {
  constructor(
    public code: "not_found" | "inactive" | "locked" | "failed",
    public lockedUntil: number | null = null
  ) {
    super(code);
    this.name = "RotateError";
  }
}

export async function rotateMarketingIp(userId: string, email: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { userId, product: Product.MARKETING },
    include: {
      plan: true,
      nodes: true,
      credentials: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription?.credentials) {
    throw new RotateError("not_found");
  }

  await applyMarketingRotate({ ...subscription, credentials: subscription.credentials });
  return loadAccountSnapshot(email, userId);
}

export async function rotateMarketingSubscription(subscriptionId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      plan: true,
      nodes: true,
      credentials: true,
    },
  });

  if (!subscription || subscription.product !== Product.MARKETING || !subscription.credentials) {
    throw new RotateError("not_found");
  }

  await applyMarketingRotate({ ...subscription, credentials: subscription.credentials });
}

async function applyMarketingRotate(subscription: MarketingSubscription) {
  const credentials = subscription.credentials;

  if (subscription.status !== SubscriptionStatus.ACTIVE) {
    throw new RotateError("inactive", credentials.rotateLockedUntil?.getTime() ?? null);
  }

  const now = new Date();
  const lockUntil = new Date(now.getTime() + rotateCooldownMs());
  const claimed = await prisma.credential.updateMany({
    where: {
      id: credentials.id,
      OR: [{ rotateLockedUntil: null }, { rotateLockedUntil: { lte: now } }],
    },
    data: { rotateLockedUntil: lockUntil },
  });

  if (claimed.count === 0) {
    throw new RotateError("locked", credentials.rotateLockedUntil?.getTime() ?? null);
  }

  try {
    const pool = await prisma.node.findMany({
      where: {
        product: Product.MARKETING,
        status: { not: NodeHealth.OFFLINE },
      },
      orderBy: { createdAt: "asc" },
    });

    const fromIp = credentials.exitIp ?? "";
    const nextNode = pickNextNode(subscription.nodes[0]?.id, pool);
    let toIp = nextNode ? exitHostFor(nextNode, pool) : nextExitIp(fromIp);
    if (!toIp || toIp === fromIp) {
      toIp = nextExitIp(fromIp || toIp || "");
    }

    const secrets = issueMarketingSecrets({
      exitIp: toIp,
      httpUser: credentials.httpUser || undefined,
      wgAddress: credentials.wgAddress || "10.8.0.12/32",
    });
    const region = regionFrom(nextNode, credentials.region ?? subscription.plan.nodeCodes[0]);

    await prisma.$transaction(async (tx) => {
      await tx.credential.update({
        where: { id: credentials.id },
        data: {
          exitIp: secrets.exitIp,
          region,
          httpUser: secrets.httpUser,
          httpPass: secrets.httpPass,
          httpPort: secrets.httpPort,
          socksPort: secrets.socksPort,
          wgPrivateKey: secrets.wgPrivateKey,
          wgPublicKey: secrets.wgPublicKey,
          wgAddress: secrets.wgAddress,
          wgEndpointPort: secrets.wgEndpointPort,
          lastRotateAt: now,
          rotateLockedUntil: lockUntil,
        },
      });
      await tx.rotateEvent.create({
        data: {
          subscriptionId: subscription.id,
          fromIp: fromIp || "none",
          toIp: secrets.exitIp,
        },
      });
      if (nextNode) {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: { nodes: { set: [{ id: nextNode.id }] } },
        });
      }
    });

    if (!isProvisionSimulate() && nextNode && credentials.uuid && credentials.xuiEmail) {
      await addXuiClient(nextNode, {
        uuid: credentials.uuid,
        email: credentials.xuiEmail,
        expiresAt: subscription.expiresAt,
        trafficGb: subscription.plan.trafficGb,
      });
    }
  } catch (error) {
    await prisma.credential
      .update({
        where: { id: credentials.id },
        data: { rotateLockedUntil: null },
      })
      .catch(() => undefined);

    if (error instanceof RotateError) {
      throw error;
    }

    throw new RotateError("failed");
  }
}
