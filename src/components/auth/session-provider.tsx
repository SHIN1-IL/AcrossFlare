"use client";

import { useEffect } from "react";
import type { PublicSession } from "@/lib/auth-types";
import { hydrateSession } from "@/lib/session";

export function SessionProvider({
  initialSession,
  children,
}: {
  initialSession: PublicSession | null;
  children: React.ReactNode;
}) {
  useEffect(() => {
    hydrateSession(initialSession);
  }, [initialSession]);

  return children;
}
