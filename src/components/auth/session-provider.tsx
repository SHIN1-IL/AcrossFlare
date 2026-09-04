"use client";

import { useLayoutEffect } from "react";
import type { PublicSession } from "@/lib/auth-types";
import {
  clearSignedInFlag,
  hydrateSession,
  markSessionProbeDone,
  refreshSession,
  shouldRefreshSession,
  writeSignedInFlag,
} from "@/lib/session";

export function SessionProvider({
  initialSession,
  children,
}: {
  initialSession?: PublicSession | null;
  children: React.ReactNode;
}) {
  useLayoutEffect(() => {
    if (initialSession !== undefined) {
      hydrateSession(initialSession);
      if (initialSession) {
        writeSignedInFlag();
      } else {
        clearSignedInFlag();
      }
      markSessionProbeDone();
      return;
    }

    if (!shouldRefreshSession()) {
      markSessionProbeDone();
      return;
    }

    void refreshSession().finally(() => {
      markSessionProbeDone();
    });
  }, [initialSession]);

  return children;
}
