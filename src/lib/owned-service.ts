import { publicServiceFromPlanId } from "@/lib/public-service";
import type { AccountSnapshot } from "@/lib/account";

type ServiceRow = {
  planId: string;
  status: string;
  expiresAt: Date | string;
};

/** Latest row whose plan is the same kind as `planId` (standard, hybrid, or workspace). */
export function pickSameService<T extends { planId: string }>(rows: T[], planId: string) {
  const service = publicServiceFromPlanId(planId);
  return rows.find((row) => publicServiceFromPlanId(row.planId) === service);
}

/** True when that kind is already provisioning or still inside its paid period. */
export function hasActiveService(rows: ServiceRow[], planId: string, now = new Date()) {
  const service = publicServiceFromPlanId(planId);
  return rows.some((row) => {
    if (publicServiceFromPlanId(row.planId) !== service) {
      return false;
    }

    const status = row.status.toLowerCase();
    if (status === "provisioning") {
      return true;
    }
    if (status !== "active") {
      return false;
    }

    return new Date(row.expiresAt).getTime() > now.getTime();
  });
}

export function accountServiceRows(account: AccountSnapshot): ServiceRow[] {
  return [account.global, account.hybrid, account.workspace, account.marketing].flatMap((lane) =>
    lane ? [{ planId: lane.planId, status: lane.status, expiresAt: lane.expiresAt }] : []
  );
}
