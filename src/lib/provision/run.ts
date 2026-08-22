import {
  NodeHealth,
  Product,
  SubscriptionStatus,
  type Node,
  type Plan,
  type Subscription,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { appUrl, isProvisionSimulate, nextcloudBaseUrl } from "@/lib/provision/config";
import { exitHostFor, issueMarketingSecrets, nextWgAddress, regionFrom } from "@/lib/marketing/secrets";
import {
  buildVlessYaml,
  defaultExitIp,
  karingDeepLink,
  newClientUuid,
  newSecret,
  newYamlToken,
  nextcloudUserId,
  simulatedAppPassword,
  xuiClientEmail,
  yamlUrlFor,
} from "@/lib/provision/build";
import { createNextcloudAppPassword, createNextcloudUser } from "@/lib/provision/nextcloud";
import { addXuiClient, updateXuiClientExpiry } from "@/lib/provision/xui";

type LoadedSubscription = Subscription & {
  plan: Plan;
  nodes: Node[];
  credentials: {
    uuid: string | null;
    xuiEmail: string | null;
  } | null;
  user: { email: string };
};

export class ProvisionError extends Error {
  constructor(
    public code: string,
    message?: string
  ) {
    super(message ?? code);
    this.name = "ProvisionError";
  }
}

export async function provisionSubscription(subscriptionId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: {
      plan: true,
      nodes: true,
      credentials: true,
      user: { select: { email: true } },
    },
  });

  if (!subscription) {
    throw new ProvisionError("subscription_not_found");
  }

  if (subscription.status === SubscriptionStatus.ACTIVE && subscription.credentials) {
    await renewIssuedSubscription(subscription);
    return subscription.id;
  }

  if (
    subscription.status !== SubscriptionStatus.PROVISIONING &&
    subscription.status !== SubscriptionStatus.FAILED
  ) {
    return subscription.id;
  }

  const claimed = await prisma.subscription.updateMany({
    where: {
      id: subscription.id,
      OR: [
        { status: SubscriptionStatus.FAILED },
        {
          status: SubscriptionStatus.PROVISIONING,
          provisionStep: { in: ["queued", ""] },
        },
      ],
    },
    data: {
      status: SubscriptionStatus.PROVISIONING,
      provisionStep: "xui",
      provisionError: "",
      memo: "Provisioning",
    },
  });

  if (claimed.count === 0) {
    return subscription.id;
  }

  try {
    const nodes = await assignNodes(subscription);
    const issued = await issueCredentials(subscription, nodes);

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.ACTIVE,
        provisionStep: "ready",
        provisionError: "",
        memo: "",
        nodes: { set: nodes.map((node) => ({ id: node.id })) },
        credentials: {
          upsert: {
            create: issued,
            update: issued,
          },
        },
      },
    });

    return subscription.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "provision_failed";
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.FAILED,
        provisionError: message,
        memo: "Provisioning failed",
      },
    });
    throw error;
  }
}

async function renewIssuedSubscription(subscription: LoadedSubscription) {
  if (isProvisionSimulate() || !subscription.credentials?.uuid || !subscription.credentials.xuiEmail) {
    return;
  }

  const nodes = subscription.nodes.length ? subscription.nodes : await assignNodes(subscription);
  await Promise.all(
    nodes.map((node) =>
      updateXuiClientExpiry(node, {
        uuid: subscription.credentials!.uuid!,
        email: subscription.credentials!.xuiEmail!,
        expiresAt: subscription.expiresAt,
        trafficGb: subscription.plan.trafficGb,
      })
    )
  );
}

export async function selectNodesForPlan(product: Product, plan: Plan) {
  const pool = await prisma.node.findMany({
    where: {
      product,
      status: { not: NodeHealth.OFFLINE },
    },
    orderBy: { createdAt: "asc" },
  });

  const matched = plan.nodeCodes
    .map((code) => {
      const needle = code.toLowerCase().replace(/[^a-z0-9]+/g, "");
      return pool.find((node) => node.name.toLowerCase().replace(/[^a-z0-9]+/g, "").includes(needle));
    })
    .filter((node): node is Node => Boolean(node));

  const nodes = matched.length ? uniqueNodes(matched) : pool.slice(0, Math.min(2, pool.length));
  if (!nodes.length) {
    throw new ProvisionError("node_missing");
  }

  return nodes;
}

async function assignNodes(subscription: LoadedSubscription) {
  return selectNodesForPlan(subscription.product, subscription.plan);
}

async function issueCredentials(subscription: LoadedSubscription, nodes: Node[]) {
  if (subscription.product === Product.GLOBAL) {
    return issueGlobal(subscription, nodes);
  }

  return issueMarketing(subscription, nodes);
}

async function issueGlobal(subscription: LoadedSubscription, nodes: Node[]) {
  const uuid = newClientUuid();
  const xuiEmail = xuiClientEmail(subscription.id);
  const yamlToken = newYamlToken();
  const hosts = nodes.map((node) => node.ddns);
  const yamlBody = buildVlessYaml(hosts, uuid);
  const yamlUrl = yamlUrlFor(yamlToken, appUrl());
  const quotaGb = subscription.plan.backupGb ?? 1;
  const nextcloudUser = nextcloudUserId(subscription.id);
  const loginPassword = newSecret(16);

  await addClients(nodes, {
    uuid,
    email: xuiEmail,
    expiresAt: subscription.expiresAt,
    trafficGb: subscription.plan.trafficGb,
  });

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { provisionStep: "nextcloud" },
  });

  let nextcloudAppPassword = simulatedAppPassword(subscription.id);
  if (isProvisionSimulate()) {
    await wait(400);
  } else {
    await createNextcloudUser({
      userId: nextcloudUser,
      password: loginPassword,
      email: subscription.user.email,
      quotaGb,
    });
    nextcloudAppPassword = await createNextcloudAppPassword({
      userId: nextcloudUser,
      password: loginPassword,
    });
  }

  return {
    uuid,
    xuiEmail,
    deepLink: karingDeepLink(yamlUrl),
    yamlToken,
    yamlBody,
    nextcloudUrl: nextcloudBaseUrl(),
    nextcloudUser,
    nextcloudAppPassword,
    exitIp: null,
    region: null,
    httpUser: null,
    httpPass: null,
    httpPort: null,
    socksPort: null,
    wgPrivateKey: null,
    wgPublicKey: null,
    wgAddress: null,
    wgEndpointPort: null,
  };
}

async function issueMarketing(subscription: LoadedSubscription, nodes: Node[]) {
  const uuid = newClientUuid();
  const xuiEmail = xuiClientEmail(subscription.id);
  const used = await prisma.credential.findMany({ select: { wgAddress: true } });
  const secrets = issueMarketingSecrets({
    exitIp: exitHostFor(nodes[0], nodes) ?? defaultExitIp(subscription.id),
    wgAddress: nextWgAddress(used.map((row) => row.wgAddress)),
  });
  const region = regionFrom(nodes[0], subscription.plan.nodeCodes[0] ?? "US-East");

  await addClients(nodes.slice(0, 1), {
    uuid,
    email: xuiEmail,
    expiresAt: subscription.expiresAt,
    trafficGb: subscription.plan.trafficGb,
  });

  return {
    uuid,
    xuiEmail,
    deepLink: null,
    yamlToken: null,
    yamlBody: null,
    nextcloudUrl: null,
    nextcloudUser: null,
    nextcloudAppPassword: null,
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
  };
}

async function addClients(
  nodes: Node[],
  input: { uuid: string; email: string; expiresAt: Date; trafficGb: number | null }
) {
  if (isProvisionSimulate()) {
    await wait(400);
    return;
  }

  await Promise.all(nodes.map((node) => addXuiClient(node, input)));
}

function uniqueNodes(nodes: Node[]) {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    if (seen.has(node.id)) {
      return false;
    }
    seen.add(node.id);
    return true;
  });
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
