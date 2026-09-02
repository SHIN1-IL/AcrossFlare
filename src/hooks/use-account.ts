"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  getAccount,
  getAccountVersion,
  getRotateError,
  isRemoteAccountReady,
  isRotateInFlight,
  refreshRemoteAccount,
  subscribeAccount,
} from "@/lib/account-store";
import { getPreviewEmail, getSession, hasSignedInFlag, lookupEmail, subscribeSession } from "@/lib/session";

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

export function useSignedInFlag() {
  return useSyncExternalStore(subscribeSession, hasSignedInFlag, () => false);
}

export function useAccount() {
  const session = useSession();
  useSyncExternalStore(subscribeAccount, getAccountVersion, () => 0);
  const rotating = useSyncExternalStore(subscribeAccount, isRotateInFlight, () => false);
  const rotateError = useSyncExternalStore(subscribeAccount, getRotateError, () => null);
  const previewEmail = useSyncExternalStore(subscribeSession, getPreviewEmail, () => null);
  const email = lookupEmail(session);
  const account = email ? getAccount(email, Boolean(previewEmail)) : null;
  const accountReady = Boolean(previewEmail) || !session || isRemoteAccountReady(session.email);

  useEffect(() => {
    if (!session) {
      return;
    }

    if (isRemoteAccountReady(session.email)) {
      return;
    }

    void refreshRemoteAccount(session.email);
  }, [session]);

  return { account, accountReady, rotating, rotateError, session };
}
