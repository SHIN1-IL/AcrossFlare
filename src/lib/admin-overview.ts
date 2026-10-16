import type { AdminBootstrapJob, AdminPoolCapacity } from "@/lib/admin";
import type { AdminServiceId } from "@/lib/admin-service";

const POOL_GLOBAL_STANDARD = "global-standard";
const POOL_GLOBAL_HYBRID = "global-hybrid";
const POOL_MARKETING_DEFAULT = "marketing-default";

export function poolsForAdminService(service: AdminServiceId, pools: AdminPoolCapacity[]) {
  if (service === "standard") {
    return pools.filter((pool) => pool.id === POOL_GLOBAL_STANDARD);
  }
  if (service === "hybrid") {
    return pools.filter((pool) => pool.id === POOL_GLOBAL_HYBRID);
  }
  return pools.filter(
    (pool) => pool.id === POOL_MARKETING_DEFAULT || pool.product.toLowerCase() === "workspace"
  );
}

export function jobsForAdminService(service: AdminServiceId, jobs: AdminBootstrapJob[]) {
  return jobs.filter((job) => {
    const product = job.product.toLowerCase();
    if (service === "workspace") {
      return product === "workspace" || product === "marketing";
    }
    if (product !== "global") {
      return false;
    }
    if (service === "hybrid") {
      return job.poolId === POOL_GLOBAL_HYBRID;
    }
    return job.poolId === POOL_GLOBAL_STANDARD || !job.poolId;
  });
}
