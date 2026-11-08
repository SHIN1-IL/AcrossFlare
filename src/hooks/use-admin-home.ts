import { useEffect, useState } from "react";
import type { AdminHomeSummary } from "@/lib/admin-home-summary";

export function useAdminHomeSummary() {
  const [summary, setSummary] = useState<AdminHomeSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/v1/admin/home", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as AdminHomeSummary;
      })
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummary(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return summary;
}
