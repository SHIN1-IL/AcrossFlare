"use client";

import { useEffect } from "react";
import { PwaInstallBanner } from "@/components/pwa/install-banner";
import { isBackupSurfacePath } from "@/lib/pwa-surface";

export function PwaProvider() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV === "development") {
      return;
    }

    if (!isBackupSurfacePath(window.location.pathname)) {
      return;
    }

    void navigator.serviceWorker.register("/sw.js");
  }, []);

  return <PwaInstallBanner />;
}
