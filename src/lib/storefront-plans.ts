import { unstable_cache } from "next/cache";
import { listPublicPlans } from "@/lib/admin-data";
import { STOREFRONT_REVALIDATE_SECONDS } from "@/lib/http-cache";
import {
  getMarketingService,
  HOME_SLIDE_PLAN_IDS,
  MARKETING_SERVICES,
  type MarketingServiceId,
} from "@/lib/marketing-services";
import { resolveMarketingPlans, type Plan, type ProductId } from "@/lib/plans";

export const STOREFRONT_PLANS_TAG = "storefront-plans";

const PLAN_LOOKUP_MS = 800;

async function withinPlanLookup<T>(work: Promise<T>, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const settled = work.then(
    (value) => value,
    () => fallback
  );
  try {
    return await Promise.race([
      settled,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), PLAN_LOOKUP_MS);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function cachedPublicPlans(product: ProductId) {
  return unstable_cache(
    () => listPublicPlans(product),
    [STOREFRONT_PLANS_TAG, product],
    { revalidate: STOREFRONT_REVALIDATE_SECONDS, tags: [STOREFRONT_PLANS_TAG] }
  )();
}

export async function loadStorefrontPlans(
  planIds: readonly string[],
  product: ProductId
): Promise<Plan[]> {
  let live: Plan[] = [];
  try {
    live = await withinPlanLookup(cachedPublicPlans(product), []);
  } catch {
    // Docker build has no Postgres; catalog defaults apply until runtime.
  }
  return resolveMarketingPlans(planIds, live);
}

export async function loadStorefrontPlansForService(serviceId: MarketingServiceId): Promise<Plan[]> {
  const service = getMarketingService(serviceId);
  return loadStorefrontPlans(service.planIds, service.product);
}

export async function loadHomeSlidePlans(): Promise<Plan[]> {
  return loadStorefrontPlans(HOME_SLIDE_PLAN_IDS, "global");
}

export async function loadAllStorefrontPlansByService(): Promise<
  Record<MarketingServiceId, Plan[]>
> {
  let liveGlobal: Plan[] = [];
  let liveWorkspace: Plan[] = [];
  try {
    [liveGlobal, liveWorkspace] = await withinPlanLookup(
      Promise.all([cachedPublicPlans("global"), cachedPublicPlans("workspace")]),
      [[], []]
    );
  } catch {
    // catalog fallback during build
  }

  return Object.fromEntries(
    MARKETING_SERVICES.map((item) => [
      item.id,
      resolveMarketingPlans(
        item.planIds,
        item.product === "workspace" ? liveWorkspace : liveGlobal
      ),
    ])
  ) as Record<MarketingServiceId, Plan[]>;
}
