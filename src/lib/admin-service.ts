import { MARKETING_SERVICES, type MarketingServiceId } from "@/lib/marketing-services";
import { publicServiceFromPlanId } from "@/lib/public-service";
import type { ProductId } from "@/lib/plans";

export const ADMIN_SERVICES = ["standard", "hybrid", "workspace"] as const;

export type AdminServiceId = (typeof ADMIN_SERVICES)[number];

export function isAdminServiceId(value: string | null | undefined): value is AdminServiceId {
  return value === "standard" || value === "hybrid" || value === "workspace";
}

export function canonicalAdminService(segment: string | null | undefined): AdminServiceId | null {
  if (isAdminServiceId(segment)) {
    return segment;
  }
  if (segment === "global") {
    return "standard";
  }
  if (segment === "marketing") {
    return "workspace";
  }
  return null;
}

export function productForAdminService(service: AdminServiceId): ProductId {
  return service === "workspace" ? "workspace" : "global";
}

export function catalogPlanIds(service: AdminServiceId): readonly string[] {
  return MARKETING_SERVICES.find((item) => item.id === service)?.planIds ?? [];
}

export function isCatalogPlanId(planId: string) {
  return MARKETING_SERVICES.some((service) => (service.planIds as readonly string[]).includes(planId));
}

export function adminServiceFromPlanId(planId: string): AdminServiceId {
  const publicService = publicServiceFromPlanId(planId);
  if (publicService === "hybrid" || publicService === "workspace") {
    return publicService;
  }

  return "standard";
}

export function isLegacyPlanId(planId: string) {
  return !isCatalogPlanId(planId);
}

export function adminTabMessageKey(service: AdminServiceId | ProductId | MarketingServiceId) {
  if (service === "workspace") {
    return "tabWorkspace" as const;
  }
  if (service === "hybrid") {
    return "tabHybrid" as const;
  }
  if (service === "marketing") {
    return "tabMarketing" as const;
  }
  if (service === "standard") {
    return "tabStandard" as const;
  }
  return "tabStandard" as const;
}

export function adminHomeDescKey(service: AdminServiceId) {
  if (service === "workspace") {
    return "homeWorkspaceDesc" as const;
  }
  if (service === "hybrid") {
    return "homeHybridDesc" as const;
  }
  return "homeStandardDesc" as const;
}
