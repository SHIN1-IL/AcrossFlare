"use client";

import { useEffect, useState } from "react";
import type { PublicSession } from "@/lib/auth-types";
import { hydrateSession } from "@/lib/session";

export function SessionProvider({
  initialSession,
  children,
}: {
  initialSession: PublicSession | null;
  children: React.ReactNode;
}) {
  useState(() => {
    hydrateSession(initialSession);
    return true;
  });

  useEffect(() => {
    hydrateSession(initialSession);
  }, [initialSession]);

  return children;
}
