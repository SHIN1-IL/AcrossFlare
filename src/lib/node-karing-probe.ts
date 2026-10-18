import { Prisma, Product, SubscriptionStatus, type Node } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import {
  karingDeepLink,
  newClientUuid,
  newYamlToken,
  xuiClientEmail,
  yamlUrlFor,
} from "@/lib/provision/build";
import { appUrl, isProvisionSimulate } from "@/lib/provision/config";
import { nodeWiring } from "@/lib/provision/node-wiring";
import { hasRealityConfig } from "@/lib/provision/reality";
import { selectableBundle } from "@/lib/provision/capacity-expand";
import { addXuiClient, updateXuiClientExpiry, XuiError } from "@/lib/provision/xui";
import { NODE_PROBE_USER_EMAIL } from "@/lib/subscription-scope";

export { NODE_PROBE_USER_EMAIL };

const PROBE_YEARS = 10;

export class NodeKaringProbeError extends Error {
  constructor(
    public code: string,
    public status = 400
  ) {
    super(code);
    this.name = "NodeKaringProbeError";
  }
}

export function probeExpiresAt(now = new Date()) {
  const expiresAt = new Date(now);
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + PROBE_YEARS);
  return expiresAt;
}

export function probePanelErrorCode(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("inbound_missing")) {
    return "inbound_missing";
  }
  if (message.includes("login_failed") || message.includes("probe_")) {
    return "panel_unreachable";
  }
  const code = message.split(":")[0] ?? "";
  if (/^[a-z0-9_]+$/.test(code) && code.length < 64) {
    return code;
  }
  return "xui_failed";
}

export async function issueNodeKaringProbe(nodeId: string) {
  const node = await prisma.node.findUnique({ where: { id: nodeId } });
  if (!node) {
    throw new NodeKaringProbeError("not_found", 404);
  }
  if (node.product === Product.WORKSPACE || !hasRealityConfig(node)) {
    throw new NodeKaringProbeError("reality_not_configured");
  }
  if (nodeWiring(node) === "placeholder") {
    throw new NodeKaringProbeError("node_not_ready");
  }

  const plan = await prisma.plan.findFirst({
    where: { product: node.product },
    orderBy: { createdAt: "asc" },
  });
  if (!plan) {
    throw new NodeKaringProbeError("plan_missing");
  }

  const expiresAt = probeExpiresAt();
  const user = await probeUser();

  const existing = await prisma.subscription.findUnique({
    where: { probeNodeId: node.id },
    include: { credentials: true },
  });

  const yamlUrl = await persistProbeSubscription({
    existing,
    userId: user.id,
    planId: plan.id,
    product: node.product,
    expiresAt,
    probe: { probeNodeId: node.id },
    nodes: [node],
  });
  return { yamlUrl };
}

export async function issueGroupKaringProbe(groupId: string) {
  const group = await prisma.instanceGroup.findUnique({
    where: { id: groupId },
    include: {
      pool: true,
      nodes: {
        orderBy: { sortOrder: "asc" },
        include: { node: true },
      },
    },
  });
  if (!group) {
    throw new NodeKaringProbeError("not_found", 404);
  }

  const bundle = selectableBundle(
    group.nodes.map((row) => row.node),
    group.pool.maxSelectable
  );
  if (!bundle.length) {
    throw new NodeKaringProbeError("node_not_ready");
  }
  const blocked = bundle.find(
    (node) => node.product === Product.WORKSPACE || !hasRealityConfig(node) || nodeWiring(node) === "placeholder"
  );
  if (blocked) {
    throw new NodeKaringProbeError(
      nodeWiring(blocked) === "placeholder" ? "node_not_ready" : "reality_not_configured"
    );
  }
  const ready = bundle;

  const plan = await prisma.plan.findFirst({
    where: { product: ready[0].product },
    orderBy: { createdAt: "asc" },
  });
  if (!plan) {
    throw new NodeKaringProbeError("plan_missing");
  }

  const expiresAt = probeExpiresAt();
  const user = await probeUser();
  const existing = await prisma.subscription.findUnique({
    where: { probeGroupId: group.id },
    include: { credentials: true },
  });
  const yamlUrl = await persistProbeSubscription({
    existing,
    userId: user.id,
    planId: plan.id,
    product: ready[0].product,
    expiresAt,
    probe: { probeGroupId: group.id },
    nodes: ready,
  });
  return { yamlUrl };
}

async function probeUser() {
  return prisma.user.upsert({
    where: { email: NODE_PROBE_USER_EMAIL },
    update: {},
    create: {
      email: NODE_PROBE_USER_EMAIL,
      passwordHash: await hashPassword(randomBytes(32).toString("hex")),
      role: "USER",
    },
  });
}

async function persistProbeSubscription(input: {
  existing: {
    id: string;
    credentials: { uuid: string | null; yamlToken: string | null; xuiEmail: string | null } | null;
  } | null;
  userId: string;
  planId: string;
  product: Product;
  expiresAt: Date;
  probe: { probeNodeId: string } | { probeGroupId: string };
  nodes: Node[];
}) {
  let subscription = input.existing;
  if (!subscription) {
    try {
      subscription = await prisma.subscription.create({
        data: {
          userId: input.userId,
          planId: input.planId,
          product: input.product,
          status: SubscriptionStatus.ACTIVE,
          expiresAt: input.expiresAt,
          memo: "Admin Karing check",
          provisionStep: "ready",
          failover: false,
          ...input.probe,
          nodes: { connect: input.nodes.map((node) => ({ id: node.id })) },
        },
        include: { credentials: true },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        throw error;
      }
      subscription = await prisma.subscription.findUnique({
        where: input.probe,
        include: { credentials: true },
      });
      if (!subscription) {
        throw error;
      }
    }
  }

  const uuid = subscription.credentials?.uuid?.trim() || newClientUuid();
  const yamlToken = subscription.credentials?.yamlToken?.trim() || newYamlToken();
  const xuiEmail = subscription.credentials?.xuiEmail?.trim() || xuiClientEmail(subscription.id);
  const yamlUrl = yamlUrlFor(yamlToken, appUrl());

  await prisma.credential.upsert({
    where: { subscriptionId: subscription.id },
    create: {
      subscriptionId: subscription.id,
      uuid,
      xuiEmail,
      yamlToken,
      deepLink: karingDeepLink(yamlUrl),
    },
    update: {
      uuid,
      xuiEmail,
      yamlToken,
      deepLink: karingDeepLink(yamlUrl),
    },
  });

  if (!isProvisionSimulate()) {
    const client = { uuid, email: xuiEmail, expiresAt: input.expiresAt, trafficGb: null };
    for (const node of input.nodes) {
      try {
        await addXuiClient(node, client);
      } catch (error) {
        if (error instanceof XuiError || error instanceof Error) {
          throw new NodeKaringProbeError(probePanelErrorCode(error), 502);
        }
        throw error;
      }
      if (input.existing?.credentials?.uuid) {
        await updateXuiClientExpiry(node, client).catch(() => undefined);
      }
    }
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: SubscriptionStatus.ACTIVE,
      expiresAt: input.expiresAt,
      failover: false,
      provisionStep: "ready",
      provisionError: "",
      nodes: { set: input.nodes.map((node) => ({ id: node.id })) },
    },
  });

  return yamlUrl;
}
