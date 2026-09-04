"use client";

import { useLayoutEffect } from "react";
import type { AdminState } from "@/lib/admin";
import { seedAdminState } from "@/lib/admin-store";

export function AdminBootstrap({
  initialState,
  children,
}: {
  initialState: Pick<
    AdminState,
    "plans" | "nodes" | "customers" | "promoCodes" | "provisionSimulate"
  > | null;
  children: React.ReactNode;
}) {
  useLayoutEffect(() => {
    if (initialState) {
      seedAdminState(initialState);
    }
  }, [initialState]);

  return children;
}
