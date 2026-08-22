"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  getAccount,
  getAccountVersion,
  getRotateError,
  isRotateInFlight,
  refreshRemoteAccount,
  subscribeAccount,
} from "@/lib/account-store";
import { getSession, lookupEmail, subscribeSession } from "@/lib/session";

export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

export function useSession() {
  return useSyncExternalStore(subscribeSession, getSession, () => null);
}

export function useAccount() {
  const session = useSession();
  useSyncExternalStore(subscribeAccount, getAccountVersion, () => 0);
  const rotating = useSyncExternalStore(subscribeAccount, isRotateInFlight, () => false);
  const rotateError = useSyncExternalStore(subscribeAccount, getRotateError, () => null);
  const email = lookupEmail(session);
  const account = email ? getAccount(email) : null;

  useEffect(() => {
    if (!session) {
      return;
    }

    void refreshRemoteAccount();
  }, [session]);

  return { account, rotating, rotateError, session };
}
