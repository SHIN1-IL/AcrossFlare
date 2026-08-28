"use client";

import { useEffect } from "react";
import type { PublicSession } from "@/lib/auth-types";
import { getSession, hydrateSession, refreshSession } from "@/lib/session";

export function SessionProvider({
  initialSession,
  children,
}: {
  initialSession?: PublicSession | null;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (initialSession !== undefined) {
      hydrateSession(initialSession);
      return;
    }

    if (getSession()) {
      return;
    }

    void refreshSession();
  }, [initialSession]);

  return children;
}
