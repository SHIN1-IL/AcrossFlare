"use client";

import { useEffect } from "react";
import { PwaInstallBanner } from "@/components/pwa/install-banner";

export function PwaProvider() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV === "development") {
      return;
    }

    void navigator.serviceWorker.register("/sw.js");
  }, []);

  return <PwaInstallBanner />;
}
