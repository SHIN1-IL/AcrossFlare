import "dotenv/config";
import { NodeHealth, Product, Role, SubscriptionStatus } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { prisma } from "../src/lib/db";
import { provisionSubscription } from "../src/lib/provision/run";

const SMOKE_EMAIL = "smoke-live@acrossflare.com";
const PANEL_HOST = "http://127.0.0.1:2053";

async function pointSeedNodesAtLocalPanel() {
  await prisma.node.updateMany({
    data: { status: NodeHealth.OFFLINE },
  });

  await prisma.node.updateMany({
    where: { id: { in: ["g-sg-bw", "m-use-bw"] } },
    data: {
      status: NodeHealth.ONLINE,
      host: PANEL_HOST,
      port: 2053,
      username: "admin",
      password: "acrossflare-xui",
      inboundId: 1,
    },
  });
}

async function upsertSmokeUser() {
  const passwordHash = await hashPassword("acrossflare");
  return prisma.user.upsert({
    where: { email: SMOKE_EMAIL },
    update: {},
    create: {
      email: SMOKE_EMAIL,
      passwordHash,
      role: Role.USER,
    },
  });
}

async function queueSubscription(userId: string, planId: string, product: Product) {
  const existing = await prisma.subscription.findFirst({
    where: { userId, product },
    orderBy: { createdAt: "desc" },
  });

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  if (existing) {
    return prisma.subscription.update({
      where: { id: existing.id },
      data: {
        planId,
        status: SubscriptionStatus.PROVISIONING,
        expiresAt,
        memo: "live smoke",
        provisionStep: "queued",
        provisionError: "",
      },
    });
  }

  return prisma.subscription.create({
    data: {
      userId,
      planId,
      product,
      status: SubscriptionStatus.PROVISIONING,
      expiresAt,
      memo: "live smoke",
      provisionStep: "queued",
      provisionError: "",
    },
  });
}

async function report(label: string, subscriptionId: string) {
  const row = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { credentials: true, nodes: true },
  });

  const creds = row?.credentials;
  console.log(label, {
    status: row?.status,
    step: row?.provisionStep,
    error: row?.provisionError || undefined,
    nodes: row?.nodes.map((node) => node.name),
    uuidSet: Boolean(creds?.uuid),
    yamlSet: Boolean(creds?.yamlBody),
    vaultUser: creds?.vaultUser ?? null,
    vaultUrl: creds?.vaultUrl ?? null,
    syncthingUrl: creds?.syncthingUrl ?? null,
    syncthingFolderId: creds?.syncthingFolderId ?? null,
    httpPort: creds?.httpPort ?? null,
    socksPort: creds?.socksPort ?? null,
  });
}

async function rotateSmoke(userId: string) {
  const { rotateMarketingIp } = await import("../src/lib/marketing/rotate");
  const before = await prisma.credential.findFirst({
    where: { subscription: { userId, product: Product.MARKETING } },
    orderBy: { createdAt: "desc" },
  });
  await rotateMarketingIp(userId, SMOKE_EMAIL);
  const after = await prisma.credential.findFirst({
    where: { subscription: { userId, product: Product.MARKETING } },
    orderBy: { createdAt: "desc" },
  });
  const events = await prisma.rotateEvent.count({
    where: { subscription: { userId, product: Product.MARKETING } },
  });
  console.log("rotate", {
    rotated: before?.exitIp !== after?.exitIp,
    events,
    locked: Boolean(after?.rotateLockedUntil),
  });
}

async function main() {
  if (process.env.PROVISION_MODE !== "live") {
    throw new Error("PROVISION_MODE must be live");
  }

  await pointSeedNodesAtLocalPanel();
  const user = await upsertSmokeUser();

  if (process.env.SMOKE_STEP === "rotate") {
    await rotateSmoke(user.id);
    return;
  }

  const globalSub = await queueSubscription(user.id, "global-lite", Product.GLOBAL);
  await provisionSubscription(globalSub.id);
  await report("global", globalSub.id);

  const marketingSub = await queueSubscription(user.id, "marketing-lite", Product.MARKETING);
  await provisionSubscription(marketingSub.id);
  await report("marketing", marketingSub.id);

  await rotateSmoke(user.id);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
