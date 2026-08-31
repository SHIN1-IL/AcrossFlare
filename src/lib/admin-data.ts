import {
  NodeHealth,
  NodeRole,
  PaymentMethod,
  PaymentStatus,
  Product,
  PromoCodeStatus,
  SubscriptionStatus,
  type Credential,
  type Node,
  type Payment,
  type Plan,
  type PromoCode,
  type RotateEvent as DbRotateEvent,
  type Subscription,
} from "@prisma/client";
import type {
  AdminAuditEntry,
  AdminCustomer,
  AdminNode,
  AdminPayment,
  AdminPlan,
  AdminPromoCode,
  CustomerCredentials,
  CustomerStatus,
  NodeHealth as UiNodeHealth,
  NodeRole as UiNodeRole,
} from "@/lib/admin";
import { maskHost, maskSecret } from "@/lib/admin";
import { prisma } from "@/lib/db";
import type { Plan as UiPlan, ProductId } from "@/lib/plans";
import { toPrismaProduct, toProductId } from "@/lib/product";
import { appUrl, isProvisionSimulate } from "@/lib/provision/config";
import { yamlUrlFor } from "@/lib/provision/build";
import { nodeWiring } from "@/lib/provision/node-wiring";

type CustomerRow = Subscription & {
  user: { email: string };
  plan: Plan;
  nodes: Pick<Node, "id" | "ddns">[] | Node[];
  credentials?: Credential | null;
  rotateEvents?: DbRotateEvent[];
  payments?: Payment[];
};

export function toUiPlan(plan: Plan): UiPlan {
  return {
    id: plan.id,
    product: toProductId(plan.product),
    name: plan.name,
    prices: {
      krw: plan.priceKrw,
      usd: plan.priceUsd,
      cny: plan.priceCny,
      jpy: plan.priceJpy,
    },
    trafficGb: plan.trafficGb,
    backupGb: plan.backupGb,
    nodes: plan.nodeCodes,
    featured: plan.featured,
  };
}

export function toAdminPlan(plan: Plan): AdminPlan {
  return {
    ...toUiPlan(plan),
    visible: plan.visible,
  };
}

export function toAdminNode(node: Node): AdminNode {
  return {
    id: node.id,
    product: toProductId(node.product),
    name: node.name,
    ddns: node.ddns,
    role: toUiRole(node.role),
    status: toUiHealth(node.status),
    hostMasked: maskHost(node.host),
    port: node.port,
    portMasked: node.port ? String(node.port) : "",
    usernameMasked: maskSecret(node.username),
    passwordMasked: maskSecret(node.password),
    inboundId: node.inboundId,
    vlessPort: node.vlessPort,
    realityPublicKey: node.realityPublicKey ?? "",
    realityShortId: node.realityShortId ?? "",
    realityServerName: node.realityServerName ?? "",
    realityFingerprint: node.realityFingerprint ?? "",
    wiring: nodeWiring(node),
  };
}

export function toCustomerStatus(status: SubscriptionStatus): CustomerStatus {
  switch (status) {
    case SubscriptionStatus.ACTIVE:
      return "active";
    case SubscriptionStatus.UNPAID:
      return "unpaid";
    case SubscriptionStatus.FAILED:
      return "failed";
    default:
      return "provisioning";
  }
}

export function toAdminCustomer(row: CustomerRow, includeSecrets = false): AdminCustomer {
  return {
    id: row.id,
    product: toProductId(row.product),
    email: row.user.email,
    planId: row.planId,
    planName: row.plan.name,
    expiresAt: row.expiresAt.toISOString(),
    memo: row.memo,
    status: toCustomerStatus(row.status),
    nodeIds: row.nodes.map((node) => node.id),
    createdAt: row.createdAt.toISOString(),
    credentials: includeSecrets ? toCredentials(row) : null,
    rotateHistory: includeSecrets
      ? (row.rotateEvents ?? []).map((event) => ({
          id: event.id,
          at: event.createdAt.toISOString(),
          fromIp: event.fromIp,
          toIp: event.toIp,
        }))
      : [],
    planChange: null,
    provisionStep: row.provisionStep,
    provisionError: row.provisionError,
    payments: includeSecrets ? (row.payments ?? []).map(toAdminPayment) : [],
    auditLogs: [],
  };
}

export function toAdminPayment(row: Payment): AdminPayment {
  return {
    id: row.id,
    amount: row.amount,
    currency: row.currency,
    method: row.method === PaymentMethod.ALIPAY ? "alipay" : "card",
    provider: row.provider.toLowerCase(),
    status:
      row.status === PaymentStatus.SUCCEEDED
        ? "succeeded"
        : row.status === PaymentStatus.FAILED
          ? "failed"
          : "pending",
    createdAt: row.createdAt.toISOString(),
  };
}

export function toAdminAuditEntry(row: {
  id: string;
  actorEmail: string;
  action: string;
  createdAt: Date;
}): AdminAuditEntry {
  return {
    id: row.id,
    actorEmail: row.actorEmail,
    action: row.action,
    createdAt: row.createdAt.toISOString(),
  };
}

function toCredentials(row: CustomerRow): CustomerCredentials | null {
  const creds = row.credentials;
  if (!creds) {
    return null;
  }

  if ((row.product === Product.GLOBAL || row.product === Product.WORKSPACE) && creds.uuid) {
    return {
      kind: "global",
      uuid: creds.uuid,
      deepLink: creds.deepLink ?? "",
      yamlUrl: creds.yamlToken ? yamlUrlFor(creds.yamlToken, appUrl()) : "",
      yamlBody: creds.yamlBody ?? "",
      vaultUrl: creds.vaultUrl ?? "",
      syncthingUrl: creds.syncthingUrl ?? "",
      syncthingFolderId: creds.syncthingFolderId ?? "",
      nodes: row.nodes.map((node) => node.ddns),
    };
  }

  if (row.product === Product.MARKETING && creds.exitIp && creds.httpUser && creds.httpPass) {
    const httpPort = creds.httpPort ?? 8080;
    const socksPort = creds.socksPort ?? 1080;
    const wgPort = creds.wgEndpointPort ?? 51820;
    return {
      kind: "marketing",
      exitIp: creds.exitIp,
      region: creds.region ?? row.plan.nodeCodes[0] ?? "US-East",
      httpUrl: `http://${creds.httpUser}:${creds.httpPass}@${creds.exitIp}:${httpPort}`,
      socksUrl: `socks5://${creds.httpUser}:${creds.httpPass}@${creds.exitIp}:${socksPort}`,
      wgConfig: [
        "[Interface]",
        `PrivateKey = ${creds.wgPrivateKey ?? ""}`,
        `Address = ${creds.wgAddress ?? "10.8.0.12/32"}`,
        "DNS = 1.1.1.1",
        "",
        "[Peer]",
        `PublicKey = ${creds.wgPublicKey ?? ""}`,
        `Endpoint = ${creds.exitIp}:${wgPort}`,
        "AllowedIPs = 0.0.0.0/0, ::/0",
        "PersistentKeepalive = 25",
        "",
      ].join("\n"),
      lastRotateAt: creds.lastRotateAt?.toISOString() ?? null,
    };
  }

  return null;
}

function toUiRole(role: NodeRole): UiNodeRole {
  return role === NodeRole.RACKNERD ? "racknerd" : "bandwagon";
}

function toUiHealth(status: NodeHealth): UiNodeHealth {
  if (status === NodeHealth.DEGRADED) {
    return "degraded";
  }
  if (status === NodeHealth.OFFLINE) {
    return "offline";
  }
  return "online";
}

export function customerListInclude() {
  return {
    user: { select: { email: true } },
    plan: true,
    nodes: { select: { id: true, ddns: true } },
  };
}

export function customerInclude() {
  return {
    user: { select: { email: true } },
    plan: true,
    nodes: true,
    credentials: true,
    rotateEvents: { orderBy: { createdAt: "desc" as const }, take: 20 },
    payments: { orderBy: { createdAt: "desc" as const }, take: 20 },
  };
}

export function toAdminPromoCode(
  row: PromoCode & { plan: { name: string; product: Product } }
): AdminPromoCode {
  return {
    id: row.id,
    code: row.code,
    planId: row.planId,
    planName: row.plan.name,
    product: toProductId(row.plan.product),
    note: row.note,
    status: row.status === PromoCodeStatus.REDEEMED ? "redeemed" : "unused",
    reserved: Boolean(row.paymentId) && row.status === PromoCodeStatus.UNUSED,
    createdAt: row.createdAt.toISOString(),
    redeemedAt: row.redeemedAt?.toISOString() ?? null,
  };
}

export async function listAdminState() {
  const [plans, nodes, subscriptions, promoCodes] = await Promise.all([
    prisma.plan.findMany({ orderBy: { name: "asc" } }),
    prisma.node.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.subscription.findMany({
      include: customerListInclude(),
      orderBy: { createdAt: "desc" },
    }),
    prisma.promoCode.findMany({
      include: { plan: { select: { name: true, product: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    plans: plans.map(toAdminPlan),
    nodes: nodes.map(toAdminNode),
    customers: subscriptions.map((row) => toAdminCustomer(row, false)),
    promoCodes: promoCodes.map(toAdminPromoCode),
    provisionSimulate: isProvisionSimulate(),
  };
}

export async function getAdminCustomer(id: string) {
  const [row, auditLogs] = await Promise.all([
    prisma.subscription.findUnique({
      where: { id },
      include: customerInclude(),
    }),
    prisma.adminAuditLog.findMany({
      where: { targetType: "subscription", targetId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  if (!row) {
    return null;
  }

  return {
    ...toAdminCustomer(row, true),
    auditLogs: auditLogs.map(toAdminAuditEntry),
  };
}

export function parseProduct(value: string | null | undefined): Product | null {
  if (value === "global" || value === Product.GLOBAL) {
    return Product.GLOBAL;
  }
  if (value === "marketing" || value === Product.MARKETING) {
    return Product.MARKETING;
  }
  if (value === "workspace" || value === Product.WORKSPACE) {
    return Product.WORKSPACE;
  }
  return null;
}

export function parseNodeRole(value: string | null | undefined): NodeRole | null {
  if (value === "bandwagon" || value === NodeRole.BANDWAGON) {
    return NodeRole.BANDWAGON;
  }
  if (value === "racknerd" || value === NodeRole.RACKNERD) {
    return NodeRole.RACKNERD;
  }
  return null;
}

export async function listPublicPlans(product?: ProductId) {
  const plans = await prisma.plan.findMany({
    where: {
      visible: true,
      ...(product ? { product: toPrismaProduct(product) } : {}),
    },
    orderBy: { name: "asc" },
  });

  return plans.map(toUiPlan);
}
