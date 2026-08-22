import {
  NodeHealth,
  NodeRole,
  Product,
  SubscriptionStatus,
  type Credential,
  type Node,
  type Plan,
  type RotateEvent as DbRotateEvent,
  type Subscription,
} from "@prisma/client";
import type {
  AdminCustomer,
  AdminNode,
  AdminPlan,
  CustomerCredentials,
  CustomerStatus,
  NodeHealth as UiNodeHealth,
  NodeRole as UiNodeRole,
} from "@/lib/admin";
import { maskHost, maskSecret } from "@/lib/admin";
import { prisma } from "@/lib/db";
import type { Plan as UiPlan, ProductId } from "@/lib/plans";
import { toProductId } from "@/lib/product";
import { appUrl } from "@/lib/provision/config";
import { yamlUrlFor } from "@/lib/provision/build";

type CustomerRow = Subscription & {
  user: { email: string };
  plan: Plan;
  nodes: Node[];
  credentials: Credential | null;
  rotateEvents: DbRotateEvent[];
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
    portMasked: node.port ? "••••" : "••••",
    usernameMasked: maskSecret(node.username),
    passwordMasked: maskSecret(node.password),
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

export function toAdminCustomer(row: CustomerRow): AdminCustomer {
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
    credentials: toCredentials(row),
    rotateHistory: row.rotateEvents.map((event) => ({
      id: event.id,
      at: event.createdAt.toISOString(),
      fromIp: event.fromIp,
      toIp: event.toIp,
    })),
    planChange: null,
    provisionStep: row.provisionStep,
  };
}

function toCredentials(row: CustomerRow): CustomerCredentials | null {
  const creds = row.credentials;
  if (!creds) {
    return null;
  }

  if (row.product === Product.GLOBAL && creds.uuid) {
    return {
      kind: "global",
      uuid: creds.uuid,
      deepLink: creds.deepLink ?? "",
      yamlUrl: creds.yamlToken ? yamlUrlFor(creds.yamlToken, appUrl()) : "",
      yamlBody: creds.yamlBody ?? "",
      nextcloudUrl: creds.nextcloudUrl ?? "",
      nextcloudAppPassword: creds.nextcloudAppPassword ?? "",
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

export function customerInclude() {
  return {
    user: { select: { email: true } },
    plan: true,
    nodes: true,
    credentials: true,
    rotateEvents: { orderBy: { createdAt: "desc" as const }, take: 20 },
  };
}

export async function listAdminState() {
  const [plans, nodes, subscriptions] = await Promise.all([
    prisma.plan.findMany({ orderBy: { name: "asc" } }),
    prisma.node.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.subscription.findMany({
      include: customerInclude(),
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    plans: plans.map(toAdminPlan),
    nodes: nodes.map(toAdminNode),
    customers: subscriptions.map(toAdminCustomer),
  };
}

export async function getAdminCustomer(id: string) {
  const row = await prisma.subscription.findUnique({
    where: { id },
    include: customerInclude(),
  });

  return row ? toAdminCustomer(row) : null;
}

export function parseProduct(value: string | null | undefined): Product | null {
  if (value === "global" || value === Product.GLOBAL) {
    return Product.GLOBAL;
  }
  if (value === "marketing" || value === Product.MARKETING) {
    return Product.MARKETING;
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
      ...(product ? { product: product === "global" ? Product.GLOBAL : Product.MARKETING } : {}),
    },
    orderBy: { name: "asc" },
  });

  return plans.map(toUiPlan);
}
