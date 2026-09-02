import {
  emptyAccount,
  resolveAccount,
  type AccountOverlay,
  type AccountSnapshot,
  type PaymentMethod,
} from "@/lib/account";
import type { ProductId } from "@/lib/plans";

const STORE_KEY = "acrossflare.account";

type Listener = () => void;

const listeners = new Set<Listener>();
let version = 0;
let rotateInFlight = false;
let rotateError: string | null = null;
let remoteAccount: AccountSnapshot | null = null;
let remoteReadyEmail: string | null = null;

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function subscribeAccount(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAccountVersion() {
  return version;
}

function readAll(): Record<string, AccountOverlay> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(STORE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, AccountOverlay>;
  } catch {
    return {};
  }
}

function writeAll(next: Record<string, AccountOverlay>) {
  window.localStorage.setItem(STORE_KEY, JSON.stringify(next));
  emit();
}

export function getOverlay(email: string): AccountOverlay {
  return readAll()[email] ?? {};
}

function patchOverlay(email: string, patch: AccountOverlay) {
  const all = readAll();
  const current = all[email] ?? {};
  all[email] = {
    ...current,
    ...patch,
    extraProducts: patch.extraProducts ?? current.extraProducts,
    extraPlanIds: { ...current.extraPlanIds, ...patch.extraPlanIds },
    provisioning: patch.provisioning ?? current.provisioning,
    marketing: patch.marketing ?? current.marketing,
  };
  writeAll(all);
}

export function isRemoteAccountReady(email: string) {
  return remoteReadyEmail === email;
}

/** Hydrate from SSR so the console shell renders without waiting on /api/v1/account. */
export function seedRemoteAccount(account: AccountSnapshot) {
  remoteAccount = account;
  remoteReadyEmail = account.email;
  emit();
}

export function getAccount(email: string, preview = false): AccountSnapshot | null {
  if (preview) {
    return resolveAccount(email, getOverlay(email));
  }

  if (remoteReadyEmail !== email) {
    return null;
  }

  if (remoteAccount && remoteAccount.email === email) {
    return remoteAccount;
  }

  return emptyAccount(email);
}

export async function refreshRemoteAccount(email?: string) {
  const response = await fetch("/api/v1/account", { credentials: "include" });
  if (!response.ok) {
    if (email) {
      remoteAccount = emptyAccount(email);
      remoteReadyEmail = email;
    } else {
      remoteAccount = null;
      remoteReadyEmail = null;
    }
    emit();
    return null;
  }

  const data = (await response.json()) as { account?: AccountSnapshot | null };
  remoteAccount = data.account ?? (email ? emptyAccount(email) : null);
  remoteReadyEmail = remoteAccount?.email ?? email ?? null;
  emit();
  return remoteAccount;
}

export function clearRemoteAccount() {
  remoteAccount = null;
  remoteReadyEmail = null;
  emit();
}

export function provisionProduct(
  email: string,
  product: ProductId,
  planId: string,
  method: PaymentMethod
) {
  const overlay = getOverlay(email);
  const extraProducts = Array.from(new Set([...(overlay.extraProducts ?? []), product]));
  patchOverlay(email, {
    extraProducts,
    extraPlanIds: { [product]: planId },
    provisioning: (overlay.provisioning ?? []).filter((item) => item !== product),
    method,
  });
}

export function setProductPlan(email: string, product: ProductId, planId: string) {
  const overlay = getOverlay(email);
  const extraProducts = Array.from(new Set([...(overlay.extraProducts ?? []), product]));
  patchOverlay(email, {
    extraProducts,
    extraPlanIds: { [product]: planId },
  });
}

export async function rotateMarketingIp() {
  if (rotateInFlight) {
    return false;
  }

  rotateInFlight = true;
  rotateError = null;
  emit();

  try {
    const response = await fetch("/api/v1/marketing/rotate", {
      method: "POST",
      credentials: "include",
    });
    const data = (await response.json()) as {
      account?: AccountSnapshot;
      error?: string;
    };

    if (data.account) {
      remoteAccount = data.account;
    } else {
      await refreshRemoteAccount();
    }

    if (!response.ok) {
      rotateError = data.error === "locked" ? null : (data.error ?? "failed");
      return false;
    }

    return true;
  } catch {
    rotateError = "failed";
    return false;
  } finally {
    rotateInFlight = false;
    emit();
  }
}

export function isRotateInFlight() {
  return rotateInFlight;
}

export function getRotateError() {
  return rotateError;
}
