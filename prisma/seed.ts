import { PrismaClient, Product, Role, SubscriptionStatus, type Node } from "@prisma/client";
import { nodeWiring } from "../src/lib/provision/node-wiring";
import { exitHostFor, issueMarketingSecrets, nextWgAddress, regionFrom } from "../src/lib/marketing/secrets";
import { hashPassword } from "../src/lib/password";
import { reviewUserEmail, reviewUserPassword } from "../src/lib/review-user";
import { plans } from "../src/lib/plans";
import { toPrismaProduct } from "../src/lib/product";
import {
  buildVlessYamlFromNodes,
  karingDeepLink,
  newClientUuid,
  newYamlToken,
  prismaNodeToYamlNode,
  syncthingFolderId,
  vaultUserId,
  xuiClientEmail,
  yamlUrlFor,
} from "../src/lib/provision/build";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "acrossflare";

/** Placeholder rows from early deploys. Live nodes keep their own ids and are not in this list. */
const RETIRED_SEED_NODE_IDS = [
  "g-tokyo-bw",
  "g-la-b-bw",
  "g-la-a-bw",
  "g-la-rn",
  "g-tokyo-rn",
  "m-use-bw",
  "m-usw-bw",
  "g-sg-bw",
  "g-jp-bw",
  "g-us-rn",
];

const RETIRED_SEED_NAMES = new Set([
  "Tokyo-Bandwagon",
  "LA(B)-Bandwagon",
  "LA(A)-Bandwagon",
  "LA-RackNerd",
  "Tokyo-RackNerd",
  "US-East Bandwagon",
  "US-West Bandwagon",
]);

const RETIRED_SEED_DDNS = new Set([
  "node-sg.acrossflare.com",
  "node-jp.acrossflare.com",
  "node-us.acrossflare.com",
  "node-la-b.acrossflare.com",
  "node-la-rn.acrossflare.com",
  "node-tokyo-rn.acrossflare.com",
  "node-use.acrossflare.com",
  "node-usw.acrossflare.com",
]);

const RETIRED_SEED_GROUP_IDS = ["ig-global-standard-1", "ig-global-hybrid-1", "ig-marketing-1"];

// Regular USER for PG review and merchant testing. No seeded subscription, so checkout still works.
const REVIEW_USER = {
  email: reviewUserEmail(),
  password: reviewUserPassword(),
  role: Role.USER,
};

// Seed admin is a legacy full-access ADMIN. The live owner is ADMIN_OWNER_EMAIL (promoted on login).
const DEMO_USERS: { email: string; role: Role }[] = [
  { email: "admin@acrossflare.com", role: Role.ADMIN },
  { email: "global-user@acrossflare.com", role: Role.USER },
  { email: "marketing-user@acrossflare.com", role: Role.USER },
  { email: "both-user@acrossflare.com", role: Role.USER },
  { email: "exhausted-user@acrossflare.com", role: Role.USER },
  { email: "unpaid-user@acrossflare.com", role: Role.USER },
];

async function retirePlaceholderNodes() {
  const nodes = await prisma.node.findMany({
    select: { id: true, name: true, ddns: true, host: true, password: true },
  });
  const retiring = nodes.filter((node) => {
    if (RETIRED_SEED_NODE_IDS.includes(node.id) || RETIRED_SEED_NAMES.has(node.name)) {
      return true;
    }
    if (nodeWiring(node) === "placeholder") {
      return true;
    }
    return RETIRED_SEED_DDNS.has(node.ddns) && nodeWiring(node) !== "ready";
  });
  if (!retiring.length) {
    return;
  }

  console.log(
    `retire placeholder nodes: ${retiring.map((node) => `${node.name} (${node.ddns})`).join(", ")}`
  );
  await prisma.node.deleteMany({ where: { id: { in: retiring.map((node) => node.id) } } });
}

async function syncBundleStatus() {
  const groups = await prisma.instanceGroup.findMany({
    where: { status: { in: ["READY", "OPENING"] } },
    include: {
      pool: true,
      nodes: { include: { node: true } },
    },
  });
  for (const group of groups) {
    const primaries = group.nodes.filter(
      (row) =>
        row.node.role === "PRIMARY" &&
        row.node.status !== "OFFLINE" &&
        nodeWiring(row.node) === "ready"
    ).length;
    const required = Math.max(1, group.pool.maxSelectable);
    const status = primaries >= required ? "READY" : "OPENING";
    if (group.status === status) {
      continue;
    }
    await prisma.instanceGroup.update({ where: { id: group.id }, data: { status } });
    console.log(`bundle ${group.name}: ${group.status} -> ${status} (${primaries}/${required})`);
  }
}

async function dropEmptySeedGroups() {
  const groups = await prisma.instanceGroup.findMany({
    where: { id: { in: RETIRED_SEED_GROUP_IDS } },
    include: {
      nodes: { select: { nodeId: true } },
      subscriptions: { select: { id: true } },
    },
  });
  for (const group of groups) {
    if (group.nodes.length > 0 || group.subscriptions.length > 0) {
      continue;
    }
    await prisma.instanceGroup.delete({ where: { id: group.id } });
    console.log(`retire empty seed group: ${group.name}`);
  }
}

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const { poolIdForNodeCodes } = await import("../src/lib/provision/capacity");

  await prisma.capacityPool.upsert({
    where: { id: "global-standard" },
    update: { name: "Global Standard", maxSelectable: 1, seatsMaxDefault: 10 },
    create: {
      id: "global-standard",
      product: Product.GLOBAL,
      name: "Global Standard",
      maxSelectable: 1,
      seatsMaxDefault: 10,
    },
  });
  await prisma.capacityPool.upsert({
    where: { id: "global-hybrid" },
    update: { name: "Global Hybrid" },
    create: {
      id: "global-hybrid",
      product: Product.GLOBAL,
      name: "Global Hybrid",
      maxSelectable: 2,
      seatsMaxDefault: 10,
    },
  });
  await prisma.capacityPool.upsert({
    where: { id: "marketing-default" },
    update: { name: "Marketing Default", maxSelectable: 1, seatsMaxDefault: 10 },
    create: {
      id: "marketing-default",
      product: Product.MARKETING,
      name: "Marketing Default",
      maxSelectable: 1,
      seatsMaxDefault: 10,
    },
  });

  for (const plan of plans) {
    const product = toPrismaProduct(plan.product);
    const poolId = poolIdForNodeCodes(product, plan.nodes);
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: {
        product,
        name: plan.name,
        priceKrw: plan.prices.krw,
        priceUsd: plan.prices.usd,
        priceCny: plan.prices.cny,
        priceJpy: plan.prices.jpy,
        trafficGb: plan.trafficGb,
        backupGb: plan.backupGb,
        nodeCodes: plan.nodes,
        poolId,
        featured: Boolean(plan.featured),
        visible: true,
      },
      create: {
        id: plan.id,
        product,
        name: plan.name,
        priceKrw: plan.prices.krw,
        priceUsd: plan.prices.usd,
        priceCny: plan.prices.cny,
        priceJpy: plan.prices.jpy,
        trafficGb: plan.trafficGb,
        backupGb: plan.backupGb,
        nodeCodes: plan.nodes,
        poolId,
        featured: Boolean(plan.featured),
        visible: true,
      },
    });
  }

  await retirePlaceholderNodes();
  await dropEmptySeedGroups();
  await syncBundleStatus();

  for (const account of DEMO_USERS) {
    await prisma.user.upsert({
      where: { email: account.email },
      update: {
        passwordHash,
        role: account.role,
      },
      create: {
        email: account.email,
        passwordHash,
        role: account.role,
      },
    });
  }

  const reviewPasswordHash = await hashPassword(REVIEW_USER.password);
  await prisma.user.upsert({
    where: { email: REVIEW_USER.email },
    update: {
      passwordHash: reviewPasswordHash,
      role: REVIEW_USER.role,
    },
    create: {
      email: REVIEW_USER.email,
      passwordHash: reviewPasswordHash,
      role: REVIEW_USER.role,
    },
  });

  await seedDemoSubscriptions();
  await reconcileSeedMarketingTrafficSync();
}

/** Production: seed marketing demos must not poll placeholder 3x-ui panels every 5 minutes. */
async function reconcileSeedMarketingTrafficSync() {
  await prisma.subscription.updateMany({
    where: {
      id: { startsWith: "seed_m_" },
      status: SubscriptionStatus.ACTIVE,
    },
    data: {
      status: SubscriptionStatus.FAILED,
      memo: "Seed marketing demo — disabled for traffic sync",
    },
  });
}

const DEMO_SUBSCRIPTIONS = [
  {
    email: "global-user@acrossflare.com",
    product: Product.GLOBAL,
    planId: "global-standard",
    nodeIds: ["g-la-b-bw"],
    status: SubscriptionStatus.ACTIVE,
    memo: "Seed demo",
  },
  {
    email: "both-user@acrossflare.com",
    product: Product.GLOBAL,
    planId: "global-pro",
    nodeIds: ["g-tokyo-bw", "g-la-a-bw"],
    status: SubscriptionStatus.ACTIVE,
    memo: "Holds both products",
  },
  {
    email: "exhausted-user@acrossflare.com",
    product: Product.GLOBAL,
    planId: "global-standard",
    nodeIds: ["g-la-a-bw", "g-la-rn"],
    status: SubscriptionStatus.ACTIVE,
    memo: "Failed over to Racknerd",
    failover: true,
    trafficUsedGb: 150,
  },
  {
    email: "unpaid-user@acrossflare.com",
    product: Product.GLOBAL,
    planId: "global-standard",
    nodeIds: [] as string[],
    status: SubscriptionStatus.UNPAID,
    memo: "Awaiting payment",
  },
  {
    email: "marketing-user@acrossflare.com",
    product: Product.MARKETING,
    planId: "marketing-standard",
    nodeIds: ["m-use-bw"],
    status: SubscriptionStatus.UNPAID,
    memo: "Seed demo (no traffic sync until provisioned)",
  },
  {
    email: "both-user@acrossflare.com",
    product: Product.MARKETING,
    planId: "marketing-standard",
    nodeIds: ["m-usw-bw"],
    status: SubscriptionStatus.UNPAID,
    memo: "Holds both products (marketing unpaid demo)",
  },
  {
    email: "unpaid-user@acrossflare.com",
    product: Product.MARKETING,
    planId: "marketing-standard",
    nodeIds: [] as string[],
    status: SubscriptionStatus.UNPAID,
    memo: "Invoice overdue",
  },
];

async function seedDemoSubscriptions() {
  const used: string[] = [];

  for (const row of DEMO_SUBSCRIPTIONS) {
    const user = await prisma.user.findUnique({ where: { email: row.email } });
    if (!user) {
      continue;
    }

    const existing = await prisma.subscription.findFirst({
      where: { userId: user.id, product: row.product },
    });
    if (existing) {
      continue;
    }

    const nodes = row.nodeIds.length
      ? await prisma.node.findMany({
          where: { id: { in: row.nodeIds } },
          orderBy: { createdAt: "asc" },
        })
      : [];
    if (row.status === SubscriptionStatus.ACTIVE && row.nodeIds.length > 0 && nodes.length === 0) {
      continue;
    }
    const prefix = row.product === Product.GLOBAL ? "g" : row.product === Product.MARKETING ? "m" : "w";
    const subscriptionId = `seed_${prefix}_${user.id.slice(-10)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.subscription.create({
      data: {
        id: subscriptionId,
        userId: user.id,
        planId: row.planId,
        product: row.product,
        status: row.status,
        expiresAt,
        provisionStep: row.status === SubscriptionStatus.ACTIVE ? "ready" : "queued",
        memo: row.memo,
        failover: Boolean(row.failover),
        trafficUsedGb: row.trafficUsedGb ?? 0,
        nodes: nodes.length ? { connect: nodes.map((node) => ({ id: node.id })) } : undefined,
        credentials:
          row.status === SubscriptionStatus.ACTIVE
            ? {
                create:
                  row.product === Product.GLOBAL
                    ? globalSeedCredentials(
                        subscriptionId,
                        nodes,
                        Boolean(row.failover)
                      )
                    : marketingSeedCredentials(subscriptionId, nodes, used),
              }
            : undefined,
      },
    });
  }
}

function globalSeedCredentials(subscriptionId: string, nodes: Node[], failover: boolean) {
  const uuid = newClientUuid();
  const yamlToken = newYamlToken();
  const yamlUrl = yamlUrlFor(yamlToken, "http://localhost:3000");

  return {
    uuid,
    xuiEmail: xuiClientEmail(subscriptionId),
    deepLink: karingDeepLink(yamlUrl),
    yamlToken,
    yamlBody: buildVlessYamlFromNodes(nodes.map(prismaNodeToYamlNode), uuid, failover),
    vaultUrl: "https://vault.acrossflare.com",
    vaultUser: vaultUserId(subscriptionId),
    syncthingUrl: "https://sync.acrossflare.com",
    syncthingFolderId: syncthingFolderId(subscriptionId),
  };
}

function marketingSeedCredentials(subscriptionId: string, nodes: Node[], used: string[]) {
  const wgAddress = nextWgAddress(used);
  used.push(wgAddress);
  const secrets = issueMarketingSecrets({
    exitIp: exitHostFor(nodes[0], nodes) ?? "203.0.113.10",
    wgAddress,
  });

  return {
    uuid: newClientUuid(),
    xuiEmail: xuiClientEmail(subscriptionId),
    exitIp: secrets.exitIp,
    region: regionFrom(nodes[0]),
    httpUser: secrets.httpUser,
    httpPass: secrets.httpPass,
    httpPort: secrets.httpPort,
    socksPort: secrets.socksPort,
    wgPrivateKey: secrets.wgPrivateKey,
    wgPublicKey: secrets.wgPublicKey,
    wgAddress: secrets.wgAddress,
    wgEndpointPort: secrets.wgEndpointPort,
  };
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
