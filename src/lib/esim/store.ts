import { prisma } from "@/lib/db";
import {
  DEFAULT_ESIM_COPY,
  DEFAULT_ESIM_PRODUCTS,
  ESIM_SETTINGS_ID,
  type EsimProductInput,
} from "@/lib/esim/catalog";

export async function ensureEsimCatalog() {
  let settings = await prisma.esimSettings.findUnique({ where: { id: ESIM_SETTINGS_ID } });
  if (!settings) {
    settings = await prisma.esimSettings.create({
      data: { id: ESIM_SETTINGS_ID, ...DEFAULT_ESIM_COPY },
    });
  }

  const existing = await prisma.esimProduct.findMany({ orderBy: { sort: "asc" } });
  const missing = DEFAULT_ESIM_PRODUCTS.filter((product) => !existing.some((row) => row.id === product.id));
  if (missing.length > 0) {
    await prisma.esimProduct.createMany({ data: missing.map((product) => ({ ...product })) });
  }

  const products =
    missing.length > 0 ? await prisma.esimProduct.findMany({ orderBy: { sort: "asc" } }) : existing;
  return { settings, products };
}

export function toPublicEsimOffer(catalog: Awaited<ReturnType<typeof ensureEsimCatalog>>) {
  if (!catalog.settings.enabled) {
    return { enabled: false as const };
  }

  return {
    enabled: true as const,
    products: catalog.products.map(toProduct),
    copy: {
      copyNoWifi: catalog.settings.copyNoWifi,
      copyRefund: catalog.settings.copyRefund,
      copyKorea: catalog.settings.copyKorea,
      copyExit: catalog.settings.copyExit,
      copyYear: catalog.settings.copyYear,
    },
  };
}

export function toProduct(product: {
  id: string;
  name: string;
  dataGb: number;
  days: number;
  priceKrw: number;
  priceUsd: number;
  priceCny: number;
  priceJpy: number;
}): EsimProductInput {
  return {
    id: product.id,
    name: product.name,
    dataGb: product.dataGb,
    days: product.days,
    priceKrw: product.priceKrw,
    priceUsd: product.priceUsd,
    priceCny: product.priceCny,
    priceJpy: product.priceJpy,
  };
}
