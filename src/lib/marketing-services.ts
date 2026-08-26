import type { PlanPrices } from "@/lib/plans";

export const MARKETING_SERVICES = [
  {
    id: "standard",
    href: "/standard",
    planIds: ["global-week", "global-lite", "global-year"],
    product: "global",
    backdrop: 0,
  },
  {
    id: "hybrid",
    href: "/hybrid",
    planIds: ["hybrid-week", "hybrid-lite", "hybrid-year"],
    product: "global",
    backdrop: 1,
  },
  {
    id: "workspace",
    href: "/workspace",
    planIds: ["workspace-a", "workspace-b", "workspace-c"],
    product: "workspace",
    backdrop: 2,
  },
] as const;

export type MarketingServiceId = (typeof MARKETING_SERVICES)[number]["id"];

export function isMarketingServiceId(value: string | null | undefined): value is MarketingServiceId {
  return MARKETING_SERVICES.some((service) => service.id === value);
}

export function pricingServiceFromQuery(value?: string | null): MarketingServiceId {
  if (isMarketingServiceId(value)) {
    return value;
  }
  if (value === "global") {
    return "standard";
  }
  if (value === "marketing") {
    return "workspace";
  }
  return "standard";
}

export const HOME_SLIDE_PRICES: Record<string, PlanPrices> = {
  "global-lite": { krw: 9900, usd: 8, cny: 49, jpy: 1100 },
  "global-pro": { krw: 19900, usd: 15, cny: 99, jpy: 2300 },
};

export function getMarketingService(id: MarketingServiceId) {
  return MARKETING_SERVICES.find((service) => service.id === id) ?? MARKETING_SERVICES[0];
}

export function homeSlideFor(planId: string) {
  if (planId === "global-pro") {
    return {
      href: "/hybrid" as const,
      service: "hybrid" as const,
      prices: HOME_SLIDE_PRICES[planId],
    };
  }

  const service = MARKETING_SERVICES.find((item) =>
    (item.planIds as readonly string[]).includes(planId)
  );

  return {
    href: service?.href ?? "/standard",
    service: service?.id ?? "standard",
    prices: HOME_SLIDE_PRICES[planId],
  };
}
