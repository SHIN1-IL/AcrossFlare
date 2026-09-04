"use client";

import { useLayoutEffect } from "react";
import type { AccountSnapshot } from "@/lib/account";
import { seedRemoteAccount } from "@/lib/account-store";

export function AccountBootstrap({
  initialAccount,
  children,
}: {
  initialAccount: AccountSnapshot | null;
  children: React.ReactNode;
}) {
  useLayoutEffect(() => {
    if (initialAccount) {
      seedRemoteAccount(initialAccount);
    }
  }, [initialAccount]);

  return children;
}
