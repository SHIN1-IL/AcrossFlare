export type PublicServiceId = "standard" | "hybrid" | "workspace" | "marketing";

export function publicServiceFromPlanId(planId: string | null | undefined): PublicServiceId {
  if (!planId) {
    return "standard";
  }
  if (planId.startsWith("hybrid")) {
    return "hybrid";
  }
  if (planId.startsWith("workspace")) {
    return "workspace";
  }
  if (planId.startsWith("marketing")) {
    return "marketing";
  }
  return "standard";
}

export function publicServiceHref(id: PublicServiceId) {
  switch (id) {
    case "hybrid":
      return "/hybrid";
    case "workspace":
      return "/workspace";
    default:
      return "/standard";
  }
}
