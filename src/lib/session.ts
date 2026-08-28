import type { PublicSession } from "@/lib/auth-types";
import { clearRemoteAccount } from "@/lib/account-store";
import { normalizeEmail } from "@/lib/email";

export type Session = PublicSession;

type Listener = () => void;

const listeners = new Set<Listener>();
const PREVIEW_KEY = "acrossflare.previewEmail";

let current: Session | null = null;

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeSession(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export { normalizeEmail };

function samePermissions(a: Session["permissions"] = [], b: Session["permissions"] = []) {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function isSameSession(a: Session | null, b: Session | null) {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.email === b.email && a.role === b.role && samePermissions(a.permissions, b.permissions);
}

export function hydrateSession(session: Session | null) {
  if (isSameSession(current, session)) {
    return;
  }
  current = session;
  emit();
}

export function getSession(): Session | null {
  return current;
}

export function getPreviewEmail() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(PREVIEW_KEY);
}

export function setPreviewEmail(email: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (email) {
    window.localStorage.setItem(PREVIEW_KEY, normalizeEmail(email));
  } else {
    window.localStorage.removeItem(PREVIEW_KEY);
  }

  emit();
}

export function lookupEmail(session: Session | null) {
  return getPreviewEmail() ?? session?.email ?? null;
}

export async function refreshSession() {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    return current;
  }

  const data = (await response.json()) as { user?: Session | null };
  hydrateSession(data.user ?? null);
  return current;
}

export async function clearSession() {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  current = null;
  setPreviewEmail(null);
  clearRemoteAccount();
  emit();
}
