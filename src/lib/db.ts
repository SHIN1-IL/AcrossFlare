import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function datasourceUrl() {
  const url = process.env.DATABASE_URL;
  if (!url || /(?:\?|&)connection_limit=/.test(url)) {
    return url;
  }
  return `${url}${url.includes("?") ? "&" : "?"}connection_limit=5&pool_timeout=10`;
}

const url = datasourceUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(url ? { datasources: { db: { url } } } : undefined);

globalForPrisma.prisma = prisma;
