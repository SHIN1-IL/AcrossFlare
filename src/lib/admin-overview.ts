import type { AdminBootstrapJob, AdminPoolCapacity } from "@/lib/admin";
import { catalogPlanIds, type AdminServiceId } from "@/lib/admin-service";
import { getPlanById, type ProductId } from "@/lib/plans";
import { nodeNameMatchesCode } from "@/lib/provision/node-match";

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

function poolMemberIds(service: AdminServiceId, pools: AdminPoolCapacity[]) {
  return new Set(
    poolsForAdminService(service, pools).flatMap((pool) =>
      pool.groups.flatMap((group) => group.nodes.map((node) => node.id)),
    ),
  );
}

/** Standard and Hybrid share the global product, so the node table follows the seat pool and plan names. */
export function nodesForAdminService<
  T extends { id: string; product: ProductId; name: string; role: "primary" | "failover" },
>(service: AdminServiceId, nodes: T[], pools: AdminPoolCapacity[]) {
  if (service === "workspace") {
    return nodes.filter((node) => node.product === "workspace");
  }

  const ownIds = poolMemberIds(service, pools);
  const otherIds = poolMemberIds(service === "standard" ? "hybrid" : "standard", pools);
  const codes = [
    ...new Set(catalogPlanIds(service).flatMap((planId) => getPlanById(planId)?.nodes ?? [])),
  ];

  return nodes.filter((node) => {
    if (node.product !== "global") {
      return false;
    }
    if (ownIds.has(node.id)) {
      return true;
    }
    if (otherIds.has(node.id)) {
      return false;
    }
    return node.role === "primary" && codes.some((code) => nodeNameMatchesCode(node.name, code));
  });
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
