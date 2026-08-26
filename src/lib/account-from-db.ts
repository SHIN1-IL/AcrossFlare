import {
  PaymentMethod as PrismaPaymentMethod,
  PaymentStatus,
  Product,
  SubscriptionStatus,
  type Credential,
  type Payment,
  type Plan,
  type Subscription,
} from "@prisma/client";
import type { AccountSnapshot, GlobalAccount, MarketingAccount, Receipt } from "@/lib/account";
import { scenarioFromEmail } from "@/lib/account";
import { prisma } from "@/lib/db";
import { toProductId } from "@/lib/product";
import { appUrl } from "@/lib/provision/config";
import { yamlUrlFor } from "@/lib/provision/build";

type SubscriptionRow = Subscription & {
  plan: Plan;
  nodes: { ddns: string }[];
  credentials: Credential | null;
};

export async function loadAccountSnapshot(email: string, userId: string): Promise<AccountSnapshot> {
  const [subscriptions, payments] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId },
      include: { plan: true, nodes: { select: { ddns: true } }, credentials: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { userId, status: PaymentStatus.SUCCEEDED },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const latestMethod = payments[0]?.method;
  return {
    email,
    scenario: scenarioFromEmail(email),
    global: toGlobalAccount(latestByProduct(subscriptions, Product.GLOBAL)),
    marketing: toMarketingAccount(latestByProduct(subscriptions, Product.MARKETING)),
    workspace: toGlobalAccount(latestByProduct(subscriptions, Product.WORKSPACE)),
    method: latestMethod === PrismaPaymentMethod.ALIPAY ? "alipay" : "card",
    receipts: payments.map(toReceipt),
  };
}

function latestByProduct(subscriptions: SubscriptionRow[], product: Product) {
  return subscriptions.find((item) => item.product === product) ?? null;
}

export function toUiStatus(status: SubscriptionStatus): GlobalAccount["status"] | null {
  if (status === SubscriptionStatus.ACTIVE) {
    return "active";
  }
  if (status === SubscriptionStatus.PROVISIONING) {
    return "provisioning";
  }
  if (status === SubscriptionStatus.FAILED) {
    return "failed";
  }
  if (status === SubscriptionStatus.UNPAID) {
    return "unpaid";
  }
  return null;
}

function toGlobalAccount(subscription: SubscriptionRow | null): GlobalAccount | null {
  if (!subscription) {
    return null;
  }

  const status = toUiStatus(subscription.status);
  if (!status) {
    return null;
  }

  const creds = subscription.credentials;
  const yamlUrl = creds?.yamlToken ? yamlUrlFor(creds.yamlToken, appUrl()) : "";

  return {
    status,
    planId: subscription.planId,
    planName: subscription.plan.name,
    expiresAt: subscription.expiresAt.toISOString(),
    trafficUsedGb: subscription.trafficUsedGb,
    trafficLimitGb: subscription.plan.trafficGb ?? 150,
    failover: subscription.failover,
    nodes: subscription.nodes.map((node) => node.ddns),
    uuid: creds?.uuid ?? "",
    deepLink: creds?.deepLink ?? "",
    yamlUrl,
    yamlBody: creds?.yamlBody ?? "",
    vaultUrl: creds?.vaultUrl ?? "",
    vaultUser: creds?.vaultUser ?? "",
    syncthingUrl: creds?.syncthingUrl ?? "",
    syncthingFolderId: creds?.syncthingFolderId ?? "",
    backupUsedGb: subscription.backupUsedGb,
    backupLimitGb: subscription.plan.backupGb ?? 1,
  };
}

function toMarketingAccount(subscription: SubscriptionRow | null): MarketingAccount | null {
  if (!subscription) {
    return null;
  }

  const status = toUiStatus(subscription.status);
  if (!status) {
    return null;
  }

  const creds = subscription.credentials;

  return {
    status,
    planId: subscription.planId,
    planName: subscription.plan.name,
    expiresAt: subscription.expiresAt.toISOString(),
    exitIp: creds?.exitIp ?? "",
    region: creds?.region ?? subscription.plan.nodeCodes[0] ?? "US-East",
    lastRotateAt: creds?.lastRotateAt?.toISOString() ?? null,
    rotateLockedUntil: creds?.rotateLockedUntil?.getTime() ?? null,
    httpUser: creds?.httpUser ?? "",
    httpPass: creds?.httpPass ?? "",
    httpPort: creds?.httpPort ?? 8080,
    socksPort: creds?.socksPort ?? 1080,
    wgPrivateKey: creds?.wgPrivateKey ?? "",
    wgPublicKey: creds?.wgPublicKey ?? "",
    wgAddress: creds?.wgAddress ?? "10.8.0.12/32",
    wgEndpointPort: creds?.wgEndpointPort ?? 51820,
  };
}

function toReceipt(payment: Payment): Receipt {
  return {
    id: payment.id,
    date: payment.createdAt.toISOString(),
    product: toProductId(payment.product),
    planId: payment.planId,
  };
}

