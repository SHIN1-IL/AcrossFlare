import { prisma } from "@/lib/db";
import { publicServiceFromPlanId, type PublicServiceId } from "@/lib/public-service";
import { appUrl } from "@/lib/provision/config";
import {
  karingDeepLink,
  previewSubscriptionProxies,
  prismaNodeToYamlNode,
  yamlUrlFor,
  type SubscriptionPreviewProxy,
} from "@/lib/provision/build";

const previewInclude = {
  nodes: true,
  credentials: { select: { yamlToken: true } },
} as const;

export type SubscriptionPreview = {
  proxies: SubscriptionPreviewProxy[];
  yamlUrl: string;
  karingUrl: string;
};

type PreviewRow = {
  failover: boolean;
  planId: string;
  nodes: Parameters<typeof prismaNodeToYamlNode>[0][];
  credentials: { yamlToken: string | null } | null;
};

export function toSubscriptionPreview(row: PreviewRow): SubscriptionPreview | null {
  const token = row.credentials?.yamlToken?.trim();
  if (!token) {
    return null;
  }
  const yamlUrl = yamlUrlFor(token, appUrl());
  return {
    proxies: previewSubscriptionProxies(row.nodes.map(prismaNodeToYamlNode), row.failover),
    yamlUrl,
    karingUrl: karingDeepLink(yamlUrl),
  };
}

export async function loadCustomerSubscriptionPreview(id: string) {
  const row = await prisma.subscription.findUnique({
    where: { id },
    include: previewInclude,
  });
  return row ? toSubscriptionPreview(row) : null;
}

export async function loadOwnSubscriptionPreview(userId: string, service: PublicServiceId) {
  const rows = await prisma.subscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: previewInclude,
  });
  const row = rows.find((item) => publicServiceFromPlanId(item.planId) === service);
  return row ? toSubscriptionPreview(row) : null;
}
