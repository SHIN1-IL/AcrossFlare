import { listPublicPlans } from "@/lib/admin-data";
import {
  getMarketingService,
  HOME_SLIDE_PLAN_IDS,
  MARKETING_SERVICES,
  type MarketingServiceId,
} from "@/lib/marketing-services";
import { resolveMarketingPlans, type Plan, type ProductId } from "@/lib/plans";

export async function loadStorefrontPlans(
  planIds: readonly string[],
  product: ProductId
): Promise<Plan[]> {
  let live: Plan[] = [];
  try {
    live = await listPublicPlans(product);
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
    [liveGlobal, liveWorkspace] = await Promise.all([
      listPublicPlans("global"),
      listPublicPlans("workspace"),
    ]);
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
