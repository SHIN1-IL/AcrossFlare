"use client";

import { useEffect, useState } from "react";
import type { OpsHealth } from "@/lib/admin-ops-health";

let cached: OpsHealth | null = null;
let inflight: Promise<OpsHealth | null> | null = null;

async function fetchOpsHealth(): Promise<OpsHealth | null> {
  if (inflight) {
    return inflight;
  }

  inflight = (async () => {
    const response = await fetch("/api/v1/admin/ops-health", { credentials: "include" });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as OpsHealth;
    cached = data;
    return data;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

export function useOpsHealth(enabled: boolean) {
  const [health, setHealth] = useState<OpsHealth | null>(() => (enabled ? cached : null));

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;
    void fetchOpsHealth().then((data) => {
      if (!cancelled) {
        setHealth(data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return enabled ? health : null;
}

export function opsBannerDismissKey(date = new Date()) {
  return `ops-banner-dismissed-${date.toISOString().slice(0, 10)}`;
}

export function isOpsBannerDismissedToday() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(opsBannerDismissKey()) === "1";
}

export function dismissOpsBannerForToday() {
  window.localStorage.setItem(opsBannerDismissKey(), "1");
}
