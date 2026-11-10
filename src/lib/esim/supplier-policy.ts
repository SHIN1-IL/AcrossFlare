/** Wholesale USD is compared with the won price at this rate. Cost at or above the selling price stops new sales. */
export const ESIM_KRW_PER_USD = 1400;
export const ESIM_SUPPLIER_ATTEMPTS = 3;

export const ESIM_PINNED_PRODUCTS = {
  "cn-5gb": { gb: 5, days: 30 },
  "cn-10gb": { gb: 10, days: 30 },
} as const;

export type PinnedEsimProductId = keyof typeof ESIM_PINNED_PRODUCTS;

export type SupplierPackage = {
  packageCode: string;
  name: string;
  price: number;
  volume: number;
  duration: number;
  durationUnit: string;
  type?: string;
};

export function supplierLive() {
  return process.env.NODE_ENV === "production" && Boolean(process.env.ESIM_ACCESS_CODE?.trim());
}

export function isPinnedEsimProduct(id: string): id is PinnedEsimProductId {
  return id === "cn-5gb" || id === "cn-10gb";
}

export function wholesaleUsd(priceUnits: number) {
  return priceUnits / 10000;
}

/** New checkout stops when the wholesale cost reaches the selling price. */
export function marginAllows(wholesale: number, retailKrw: number) {
  return wholesale > 0 && retailKrw > 0 && wholesale * ESIM_KRW_PER_USD < retailKrw;
}

export function selectPackage(packages: SupplierPackage[], productId: string): SupplierPackage | null {
  if (!isPinnedEsimProduct(productId)) {
    return null;
  }
  const target = ESIM_PINNED_PRODUCTS[productId];
  const matches = packages.filter((item) => packageMatches(item, target.gb, target.days));
  return matches.length === 1 ? matches[0] : null;
}

export function canCancelSupplierProfile(esimStatus: string, smdpStatus: string) {
  const esim = esimStatus.trim().toUpperCase();
  const smdp = smdpStatus.trim().toUpperCase();
  if (["IN_USE", "USED_UP", "USEDUP", "SUSPENDED", "REVOKED", "CANCELED", "CANCELLED"].includes(esim)) {
    return false;
  }
  if (["INSTALLED", "INSTALLATION", "ENABLED", "DISABLED", "DELETED", "DOWNLOAD", "DOWNLOADED"].includes(smdp)) {
    return false;
  }
  return true;
}

function packageMatches(item: SupplierPackage, gb: number, days: number) {
  const name = item.name.toLowerCase();
  if (item.type && item.type.toUpperCase() !== "BASE") {
    return false;
  }
  if (!name.includes("nonhkip") || name.includes("/day") || name.includes("per day")) {
    return false;
  }
  const unit = item.durationUnit.trim().toUpperCase();
  if (item.duration !== days || (unit !== "DAY" && unit !== "DAYS")) {
    return false;
  }
  return volumeIsGb(item.volume, gb);
}

function volumeIsGb(bytes: number, gb: number) {
  const targets = [gb * 1_000_000_000, gb * 1024 ** 3];
  return targets.some((target) => Math.abs(bytes - target) / target < 0.02);
}
