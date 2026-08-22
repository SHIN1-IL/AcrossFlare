import { PrismaClient, Product, Role, SubscriptionStatus, type Node } from "@prisma/client";
import { exitHostFor, issueMarketingSecrets, nextWgAddress } from "../src/lib/marketing/secrets";
import { hashPassword } from "../src/lib/password";
import { plans } from "../src/lib/plans";
import {
  buildVlessYaml,
  karingDeepLink,
  newClientUuid,
  newYamlToken,
  simulatedAppPassword,
  xuiClientEmail,
  yamlUrlFor,
} from "../src/lib/provision/build";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "acrossflare";

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
    id: "g-sg-bw",
    product: Product.GLOBAL,
    name: "SG Bandwagon",
    ddns: "node-sg.acrossflare.com",
    role: "BANDWAGON" as const,
    status: "ONLINE" as const,
    host: "10.0.0.10",
    port: 2053,
    username: "admin",
    password: "seed-only",
  },
  {
    id: "g-jp-bw",
    product: Product.GLOBAL,
    name: "JP Bandwagon",
    ddns: "node-jp.acrossflare.com",
    role: "BANDWAGON" as const,
    status: "ONLINE" as const,
    host: "10.0.0.22",
    port: 2053,
    username: "admin",
    password: "seed-only",
  },
  {
    id: "g-us-rn",
    product: Product.GLOBAL,
    name: "US Racknerd",
    ddns: "node-us.acrossflare.com",
    role: "RACKNERD" as const,
    status: "ONLINE" as const,
    host: "10.0.0.55",
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

function productEnum(product: "global" | "marketing") {
  return product === "global" ? Product.GLOBAL : Product.MARKETING;
}

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      update: {
        product: productEnum(plan.product),
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
        product: productEnum(plan.product),
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

  await seedDemoSubscriptions();
}

const DEMO_SUBSCRIPTIONS = [
  {
    email: "global-user@acrossflare.com",
    product: Product.GLOBAL,
    planId: "global-standard",
    nodeIds: ["g-sg-bw", "g-jp-bw"],
    status: SubscriptionStatus.ACTIVE,
    memo: "Seed demo",
  },
  {
    email: "both-user@acrossflare.com",
    product: Product.GLOBAL,
    planId: "global-pro",
    nodeIds: ["g-sg-bw", "g-jp-bw", "g-us-rn"],
    status: SubscriptionStatus.ACTIVE,
    memo: "Holds both products",
  },
  {
    email: "exhausted-user@acrossflare.com",
    product: Product.GLOBAL,
    planId: "global-pro",
    nodeIds: ["g-us-rn"],
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
    const prefix = row.product === Product.GLOBAL ? "g" : "m";
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
    nextcloudUrl: "https://files.acrossflare.com",
    nextcloudUser: `af_${subscriptionId.slice(-12)}`,
    nextcloudAppPassword: simulatedAppPassword(subscriptionId),
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
    region: nodes[0]?.name.replace(/\s+(Bandwagon|Racknerd)$/i, "").trim() || "US-East",
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
