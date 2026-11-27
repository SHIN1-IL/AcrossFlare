import { useEffect, useSyncExternalStore } from "react";
import type { AdminServiceId } from "@/lib/admin-service";
import type { AdminStatePart } from "@/lib/admin-state";
import {
  getAdminState,
  getAdminVersion,
  getLivePlan,
  getPublicPlanVersion,
  isAdminSeeded,
  isChangeInFlight,
  isMigrateInFlight,
  isProvisionInFlight,
  listPublicPlans,
  refreshAdmin,
  refreshPublicPlans,
  subscribeAdmin,
} from "@/lib/admin-store";
import { getPlanById, getPlansByProduct, type ProductId } from "@/lib/plans";
import { useHydrated } from "@/hooks/use-account";

export function useAdmin(request: { slices: readonly AdminStatePart[]; services?: readonly AdminServiceId[] }) {
  useSyncExternalStore(subscribeAdmin, getAdminVersion, () => 0);
  const state = getAdminState();
  const ready = useSyncExternalStore(subscribeAdmin, isAdminSeeded, () => false);
  const provisioning = useSyncExternalStore(subscribeAdmin, isProvisionInFlight, () => false);
  const changing = useSyncExternalStore(subscribeAdmin, isChangeInFlight, () => false);
  const migrating = useSyncExternalStore(subscribeAdmin, isMigrateInFlight, () => false);
  const slicesKey = request.slices.join(",");
  const servicesKey = (request.services ?? []).join(",");

  useEffect(() => {
    const slices = slicesKey.split(",").filter(Boolean) as AdminStatePart[];
    const services = servicesKey ? (servicesKey.split(",") as AdminServiceId[]) : undefined;
    void refreshAdmin({ slices, services });
  }, [slicesKey, servicesKey]);

  return { ...state, ready, provisioning, changing, migrating };
}

export function useLivePlans(product: ProductId) {
  const hydrated = useHydrated();
  useSyncExternalStore(subscribeAdmin, getPublicPlanVersion, () => 0);

  useEffect(() => {
    void refreshPublicPlans();
  }, []);

  if (!hydrated) {
    return getPlansByProduct(product);
  }

  const live = listPublicPlans(product);
  return live.length ? live : getPlansByProduct(product);
}

export function useLivePlan(id?: string | null) {
  const hydrated = useHydrated();
  useSyncExternalStore(subscribeAdmin, getPublicPlanVersion, () => 0);
  useSyncExternalStore(subscribeAdmin, getAdminVersion, () => 0);

  useEffect(() => {
    void refreshPublicPlans();
  }, []);

  if (!id) {
    return null;
  }

  if (!hydrated) {
    return getPlanById(id);
  }

  return getLivePlan(id) ?? getPlanById(id);
}
