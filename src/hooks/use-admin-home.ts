import { useEffect, useSyncExternalStore } from "react";
import type { AdminHomeSummary } from "@/lib/admin-home-summary";
import { ADMIN_STATE_FRESH_MS } from "@/lib/admin-state";

let cache: AdminHomeSummary | null = null;
let cacheUntil = 0;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(data: AdminHomeSummary) {
  cache = data;
  cacheUntil = Date.now() + ADMIN_STATE_FRESH_MS;
  for (const listener of listeners) {
    listener();
  }
}

export function useAdminHomeSummary() {
  const summary = useSyncExternalStore(subscribe, () => cache, () => null);

  useEffect(() => {
    if (cache && Date.now() < cacheUntil) {
      return;
    }

    let cancelled = false;
    void fetch("/api/v1/admin/home", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as AdminHomeSummary;
      })
      .then((data) => {
        if (!cancelled && data) {
          publish(data);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return summary;
}
