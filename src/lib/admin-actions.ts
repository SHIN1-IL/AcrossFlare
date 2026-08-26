import {
  Product,
  PromoCodeStatus,
  SubscriptionStatus,
  type Node,
  type Plan,
  type Subscription,
} from "@prisma/client";
import { planChangeSteps, slugPlanId, type AdminCustomer, type AdminPlan, type AdminPromoCode, type JobStep } from "@/lib/admin";
import { getAdminCustomer, toAdminPlan, toAdminPromoCode } from "@/lib/admin-data";
import { productHasBackup } from "@/lib/admin-nav";
import { prisma } from "@/lib/db";
import { normalizeEmail } from "@/lib/email";
import { rotateMarketingSubscription } from "@/lib/marketing/rotate";
import { exitHostFor, regionFrom } from "@/lib/marketing/secrets";
import { hashPassword } from "@/lib/password";
import type { ProductId } from "@/lib/plans";
import { toPrismaProduct } from "@/lib/product";
import { generatePromoCode, normalizePromoCode } from "@/lib/promo";
import {
  buildVlessYaml,
  karingDeepLink,
  newClientUuid,
  newSecret,
  xuiClientEmail,
  yamlUrlFor,
} from "@/lib/provision/build";
import { appUrl, isProvisionSimulate } from "@/lib/provision/config";
import { provisionSubscription, ProvisionError, selectNodesForPlan } from "@/lib/provision/run";
import { addXuiClient, deleteXuiClient } from "@/lib/provision/xui";

export class AdminActionError extends Error {
  constructor(
    public code: string,
    public status = 400
  ) {
    super(code);
    this.name = "AdminActionError";
  }
}

type PlanInput = {
  id?: string;
  product: ProductId;
  name: string;
  prices: { krw: number; usd: number; cny: number; jpy: number };
  trafficGb: number | null;
  backupGb: number | null;
  nodes: string[];
  visible: boolean;
  featured: boolean;
};

export async function saveAdminPlan(input: PlanInput): Promise<AdminPlan> {
  const name = input.name.trim();
  if (!name) {
    throw new AdminActionError("required");
  }

  const product = toPrismaProduct(input.product);
  const data = {
    product,
    name,
    priceKrw: Math.max(0, Math.round(input.prices.krw)),
    priceUsd: Math.max(0, Math.round(input.prices.usd)),
    priceCny: Math.max(0, Math.round(input.prices.cny)),
    priceJpy: Math.max(0, Math.round(input.prices.jpy)),
    trafficGb: input.trafficGb,
    backupGb: productHasBackup(input.product) ? input.backupGb : null,
    nodeCodes: input.nodes,
    visible: input.visible,
    featured: input.featured,
  };

  if (input.id) {
    const existing = await prisma.plan.findUnique({ where: { id: input.id } });
    if (!existing || existing.product !== product) {
      throw new AdminActionError("not_found", 404);
    }

    const plan = await prisma.plan.update({ where: { id: input.id }, data });
    return toAdminPlan(plan);
  }

  let id = slugPlanId(input.product, name);
  const collision = await prisma.plan.findUnique({ where: { id } });
  if (collision) {
    id = `${id}-${newSecret(3)}`;
  }

  const plan = await prisma.plan.create({ data: { id, ...data } });
  return toAdminPlan(plan);
}

export async function createAdminPromoCode(input: {
  planId: string;
  code?: string;
  note?: string;
}): Promise<AdminPromoCode> {
  const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
  if (!plan || plan.product !== Product.WORKSPACE) {
    throw new AdminActionError("invalid_plan");
  }

  const code = normalizePromoCode(input.code || generatePromoCode());
  if (code.length < 4) {
    throw new AdminActionError("required");
  }

  const existing = await prisma.promoCode.findUnique({ where: { code } });
  if (existing) {
    throw new AdminActionError("code_taken", 409);
  }

  const row = await prisma.promoCode.create({
    data: {
      code,
      planId: plan.id,
      note: input.note?.trim() ?? "",
    },
    include: { plan: { select: { name: true, product: true } } },
  });

  return toAdminPromoCode(row);
}

export async function removeAdminPromoCode(id: string) {
  const row = await prisma.promoCode.findUnique({ where: { id } });
  if (!row) {
    throw new AdminActionError("not_found", 404);
  }
  if (row.status === PromoCodeStatus.REDEEMED || row.paymentId) {
    throw new AdminActionError("code_in_use", 409);
  }

  await prisma.promoCode.delete({ where: { id } });
}

export async function removeAdminPlan(id: string) {
  const inUse = await prisma.subscription.count({ where: { planId: id } });
  if (inUse > 0) {
    throw new AdminActionError("plan_in_use", 409);
  }

  try {
    await prisma.plan.delete({ where: { id } });
  } catch {
    throw new AdminActionError("not_found", 404);
  }
}

export async function addAdminNode(input: {
  product: ProductId;
  name: string;
  ddns: string;
  role: "BANDWAGON" | "RACKNERD";
  host: string;
  port: number;
  username: string;
  password: string;
}) {
  const name = input.name.trim();
  const ddns = input.ddns.trim().toLowerCase();
  const host = input.host.trim();
  if (!name || !ddns || !host || !input.username.trim() || !input.password) {
    throw new AdminActionError("required");
  }

  return prisma.node.create({
    data: {
      product: toPrismaProduct(input.product),
      name,
      ddns,
      role: input.role,
      host,
      port: input.port,
      username: input.username.trim(),
      password: input.password,
    },
  });
}

export async function removeAdminNode(id: string) {
  const inUse = await prisma.subscription.count({
    where: { nodes: { some: { id } } },
  });
  if (inUse > 0) {
    throw new AdminActionError("node_in_use", 409);
  }

  try {
    await prisma.node.delete({ where: { id } });
  } catch {
    throw new AdminActionError("not_found", 404);
  }
}

export async function provisionManually(input: {
  product: ProductId;
  email: string;
  planId: string;
  expiresAt: string;
  memo: string;
  simulateFail?: boolean;
}): Promise<{ customer: AdminCustomer; loginPassword?: string }> {
  const email = normalizeEmail(input.email);
  const expiresAt = parseExpiry(input.expiresAt);
  if (!email || !expiresAt) {
    throw new AdminActionError("required");
  }

  const product = toPrismaProduct(input.product);
  const plan = await prisma.plan.findUnique({ where: { id: input.planId } });
  if (!plan || plan.product !== product) {
    throw new AdminActionError("invalid_plan");
  }

  const { user, loginPassword } = await findOrCreateUser(email);
  const existing = await prisma.subscription.findFirst({
    where: { userId: user.id, product },
    include: { credentials: true },
    orderBy: { createdAt: "desc" },
  });

  if (existing?.status === SubscriptionStatus.ACTIVE && existing.credentials) {
    throw new AdminActionError("already_active", 409);
  }

  const subscription = existing
    ? await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          planId: plan.id,
          status: SubscriptionStatus.PROVISIONING,
          expiresAt,
          memo: input.memo,
          provisionStep: "queued",
          provisionError: "",
        },
      })
    : await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          product,
          status: SubscriptionStatus.PROVISIONING,
          expiresAt,
          memo: input.memo,
          provisionStep: "queued",
          provisionError: "",
        },
      });

  if (input.simulateFail) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.FAILED,
        provisionStep: "xui",
        provisionError: "simulated",
        memo: input.memo,
      },
    });
  } else {
    try {
      await provisionSubscription(subscription.id);
    } catch (error) {
      if (!(error instanceof ProvisionError)) {
        console.error("admin_provision_failed", error);
      }
    }
  }

  const customer = await getAdminCustomer(subscription.id);
  if (!customer) {
    throw new AdminActionError("not_found", 404);
  }

  return { customer, loginPassword };
}

export async function changeCustomerPlan(input: {
  customerId: string;
  toPlanId: string;
  simulateFail?: boolean;
}): Promise<{ customer: AdminCustomer; steps: JobStep[]; failed: boolean }> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: input.customerId },
    include: { plan: true, nodes: true, credentials: true },
  });

  if (!subscription) {
    throw new AdminActionError("not_found", 404);
  }

  const toPlan = await prisma.plan.findUnique({ where: { id: input.toPlanId } });
  if (!toPlan || toPlan.product !== subscription.product || toPlan.id === subscription.planId) {
    throw new AdminActionError("invalid_plan");
  }

  if (subscription.status !== SubscriptionStatus.ACTIVE) {
    throw new AdminActionError("inactive");
  }

  let steps = markStep(planChangeSteps(), 0, "running");

  if (input.simulateFail) {
    steps = markStep(markStep(steps, 0, "done"), 1, "failed");
    const customer = await getAdminCustomer(subscription.id);
    return { customer: customer!, steps, failed: true };
  }

  try {
    await destroyXuiClients(subscription.nodes, subscription.credentials);
    steps = markStep(steps, 0, "done");
    steps = markStep(steps, 1, "running");

    const nextNodes = await selectNodesForPlan(subscription.product, toPlan);
    const issued = await recreateClients(subscription, toPlan, nextNodes);
    steps = markStep(steps, 1, "done");
    steps = markStep(steps, 2, "running");

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        planId: toPlan.id,
        provisionStep: "ready",
        provisionError: "",
        nodes: { set: nextNodes.map((node) => ({ id: node.id })) },
        credentials: {
          upsert: {
            create: issued,
            update: issued,
          },
        },
      },
    });
    steps = markStep(steps, 2, "done");
  } catch (error) {
    const running = steps.findIndex((step) => step.status === "running");
    steps = markStep(steps, running >= 0 ? running : 0, "failed");
    if (error instanceof ProvisionError || error instanceof AdminActionError) {
      throw error;
    }
    throw new AdminActionError("change_failed", 500);
  }

  const customer = await getAdminCustomer(subscription.id);
  return { customer: customer!, steps, failed: false };
}

export async function migrateNodeUsers(input: {
  product: ProductId;
  fromNodeId: string;
  toNodeId: string;
}) {
  if (input.fromNodeId === input.toNodeId) {
    throw new AdminActionError("same_node");
  }

  const product = toPrismaProduct(input.product);
  const [from, to] = await Promise.all([
    prisma.node.findFirst({ where: { id: input.fromNodeId, product } }),
    prisma.node.findFirst({ where: { id: input.toNodeId, product } }),
  ]);

  if (!from || !to) {
    throw new AdminActionError("not_found", 404);
  }

  const movers = await prisma.subscription.findMany({
    where: {
      product,
      nodes: { some: { id: from.id } },
    },
    include: { plan: true, nodes: true, credentials: true },
  });

  if (!movers.length) {
    throw new AdminActionError("no_users");
  }

  let done = 0;
  for (const subscription of movers) {
    const keep = subscription.nodes.filter((node) => node.id !== from.id);
    const nextNodes = uniqueById([...keep, to]);

    if (!isProvisionSimulate() && subscription.credentials?.uuid && subscription.credentials.xuiEmail) {
      await deleteXuiClient(from, {
        uuid: subscription.credentials.uuid,
        email: subscription.credentials.xuiEmail,
      }).catch(() => undefined);
      await addXuiClient(to, {
        uuid: subscription.credentials.uuid,
        email: subscription.credentials.xuiEmail,
        expiresAt: subscription.expiresAt,
        trafficGb: subscription.plan.trafficGb,
      });
    }

    const yamlPatch =
      subscription.product === Product.GLOBAL && subscription.credentials?.uuid && subscription.credentials.yamlToken
        ? {
            yamlBody: buildVlessYaml(
              nextNodes.map((node) => node.ddns),
              subscription.credentials.uuid
            ),
            deepLink: karingDeepLink(yamlUrlFor(subscription.credentials.yamlToken, appUrl())),
          }
        : {};

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        nodes: { set: nextNodes.map((node) => ({ id: node.id })) },
        ...(Object.keys(yamlPatch).length
          ? {
              credentials: {
                update: yamlPatch,
              },
            }
          : {}),
      },
    });
    done += 1;
  }

  return { total: movers.length, done };
}

export async function rotateAdminCustomer(customerId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: customerId },
    include: { user: { select: { email: true } } },
  });

  if (!subscription || subscription.product !== Product.MARKETING) {
    throw new AdminActionError("not_found", 404);
  }

  await rotateMarketingSubscription(subscription.id);
  const customer = await getAdminCustomer(subscription.id);
  if (!customer) {
    throw new AdminActionError("not_found", 404);
  }

  return customer;
}

async function findOrCreateUser(email: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { user: existing, loginPassword: undefined as string | undefined };
  }

  const loginPassword = newSecret(12);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(loginPassword),
      role: "USER",
    },
  });

  return { user, loginPassword };
}

function parseExpiry(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    date.setUTCHours(23, 59, 59, 0);
  }

  return date;
}

async function destroyXuiClients(
  nodes: Node[],
  credentials: { uuid: string | null; xuiEmail: string | null } | null
) {
  if (isProvisionSimulate() || !credentials?.uuid || !credentials.xuiEmail) {
    return;
  }

  await Promise.all(
    nodes.map((node) =>
      deleteXuiClient(node, { uuid: credentials.uuid!, email: credentials.xuiEmail! }).catch(() => undefined)
    )
  );
}

async function recreateClients(
  subscription: Subscription & { credentials: { yamlToken: string | null; vaultUrl: string | null; vaultUser: string | null; syncthingUrl: string | null; syncthingFolderId: string | null } | null },
  plan: Plan,
  nodes: Node[]
) {
  const uuid = newClientUuid();
  const xuiEmail = xuiClientEmail(subscription.id);

  if (!isProvisionSimulate()) {
    await Promise.all(
      nodes.map((node) =>
        addXuiClient(node, {
          uuid,
          email: xuiEmail,
          expiresAt: subscription.expiresAt,
          trafficGb: plan.trafficGb,
        })
      )
    );
  }

  if (subscription.product === Product.GLOBAL) {
    const yamlToken =
      subscription.credentials?.yamlToken ?? `${subscription.id.replace(/[^a-zA-Z0-9]/g, "").slice(-16)}`;
    const yamlUrl = yamlUrlFor(yamlToken, appUrl());
    return {
      uuid,
      xuiEmail,
      yamlToken,
      yamlBody: buildVlessYaml(
        nodes.map((node) => node.ddns),
        uuid
      ),
      deepLink: karingDeepLink(yamlUrl),
      vaultUrl: subscription.credentials?.vaultUrl,
      vaultUser: subscription.credentials?.vaultUser,
      syncthingUrl: subscription.credentials?.syncthingUrl,
      syncthingFolderId: subscription.credentials?.syncthingFolderId,
    };
  }

  return {
    uuid,
    xuiEmail,
    exitIp: exitHostFor(nodes[0], nodes),
    region: regionFrom(nodes[0], plan.nodeCodes[0] ?? "US-East"),
  };
}

function markStep(steps: JobStep[], index: number, status: JobStep["status"]) {
  return steps.map((step, stepIndex) => (stepIndex === index ? { ...step, status } : step));
}

function uniqueById(nodes: Node[]) {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    if (seen.has(node.id)) {
      return false;
    }
    seen.add(node.id);
    return true;
  });
}

