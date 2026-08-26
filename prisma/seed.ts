import { PrismaClient, Product, Role, SubscriptionStatus, type Node } from "@prisma/client";
import { exitHostFor, issueMarketingSecrets, nextWgAddress, regionFrom } from "../src/lib/marketing/secrets";
import { hashPassword } from "../src/lib/password";
import { plans } from "../src/lib/plans";
import { toPrismaProduct } from "../src/lib/product";
import {
  buildVlessYaml,
  karingDeepLink,
  newClientUuid,
  newYamlToken,
  syncthingFolderId,
  vaultUserId,
  xuiClientEmail,
  yamlUrlFor,
} from "../src/lib/provision/build";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "acrossflare";

// Regular USER for PG review and merchant testing. No seeded subscription, so checkout still works.
const REVIEW_USER = {
  email: "shin@acrosstool.com",
  password: "12345678",
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

const SEED_NODES = [
  {
    id: "g-tokyo-bw",
    product: Product.GLOBAL,
    name: "Tokyo-Bandwagon",
    ddns: "node-tokyo.acrossflare.com",
    role: "BANDWAGON" as const,
    status: "ONLINE" as const,
    host: "10.0.0.22",
    port: 2053,
    username: "admin",
    password: "seed-only",
  },
  {
    id: "g-la-b-bw",
    product: Product.GLOBAL,
    name: "LA(B)-Bandwagon",
    ddns: "node-la-b.acrossflare.com",
    role: "BANDWAGON" as const,
    status: "ONLINE" as const,
    host: "10.0.0.55",
    port: 2053,
    username: "admin",
    password: "seed-only",
  },
  {
    id: "g-la-a-bw",
    product: Product.GLOBAL,
    name: "LA(A)-Bandwagon",
    ddns: "node-la-a.acrossflare.com",
    role: "BANDWAGON" as const,
    status: "ONLINE" as const,
    host: "10.0.0.66",
    port: 2053,
    username: "admin",
    password: "seed-only",
  },
  {
    id: "m-use-bw",
    product: Product.MARKETING,
    name: "US-East Bandwagon",
    ddns: "node-use.acrossflare.com",
    role: "BANDWAGON" as const,
    status: "ONLINE" as const,
    host: "10.0.0.10",
    port: 2053,
    username: "admin",
    password: "seed-only",
  },
  {
    id: "m-usw-bw",
    product: Product.MARKETING,
    name: "US-West Bandwagon",
    ddns: "node-usw.acrossflare.com",
    role: "BANDWAGON" as const,
    status: "ONLINE" as const,
    host: "10.0.0.44",
    port: 2053,
    username: "admin",
    password: "seed-only",
  },
];

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: {
        product: toPrismaProduct(plan.product),
        name: plan.name,
        priceKrw: plan.prices.krw,
        priceUsd: plan.prices.usd,
        priceCny: plan.prices.cny,
        priceJpy: plan.prices.jpy,
        trafficGb: plan.trafficGb,
        backupGb: plan.backupGb,
        nodeCodes: plan.nodes,
        featured: Boolean(plan.featured),
        visible: true,
      },
      create: {
        id: plan.id,
        product: toPrismaProduct(plan.product),
        name: plan.name,
        priceKrw: plan.prices.krw,
        priceUsd: plan.prices.usd,
        priceCny: plan.prices.cny,
        priceJpy: plan.prices.jpy,
        trafficGb: plan.trafficGb,
        backupGb: plan.backupGb,
        nodeCodes: plan.nodes,
        featured: Boolean(plan.featured),
        visible: true,
      },
    });
  }

  await prisma.node.deleteMany({
    where: {
      OR: [
        { id: { in: ["g-sg-bw", "g-jp-bw", "g-us-rn"] } },
        {
          ddns: {
            in: ["node-sg.acrossflare.com", "node-jp.acrossflare.com", "node-us.acrossflare.com"],
          },
        },
      ],
    },
  });

  for (const node of SEED_NODES) {
    await prisma.node.upsert({
      where: { id: node.id },
      update: {
        product: node.product,
        name: node.name,
        ddns: node.ddns,
        role: node.role,
        status: node.status,
        host: node.host,
        port: node.port,
        username: node.username,
        password: node.password,
      },
      create: node,
    });
  }

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
    planId: "global-pro",
    nodeIds: ["g-la-a-bw"],
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
    status: SubscriptionStatus.ACTIVE,
    memo: "Seed demo",
  },
  {
    email: "both-user@acrossflare.com",
    product: Product.MARKETING,
    planId: "marketing-standard",
    nodeIds: ["m-usw-bw"],
    status: SubscriptionStatus.ACTIVE,
    memo: "Holds both products",
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
        nodes: row.nodeIds.length ? { connect: row.nodeIds.map((id) => ({ id })) } : undefined,
        credentials:
          row.status === SubscriptionStatus.ACTIVE
            ? {
                create:
                  row.product === Product.GLOBAL
                    ? globalSeedCredentials(subscriptionId, nodes.map((node) => node.ddns))
                    : marketingSeedCredentials(subscriptionId, nodes, used),
              }
            : undefined,
      },
    });
  }
}

function globalSeedCredentials(subscriptionId: string, hosts: string[]) {
  const uuid = newClientUuid();
  const yamlToken = newYamlToken();
  const yamlUrl = yamlUrlFor(yamlToken, "http://localhost:3000");

  return {
    uuid,
    xuiEmail: xuiClientEmail(subscriptionId),
    deepLink: karingDeepLink(yamlUrl),
    yamlToken,
    yamlBody: buildVlessYaml(hosts, uuid),
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
