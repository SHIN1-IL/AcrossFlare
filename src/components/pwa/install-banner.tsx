"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { isBackupSurfacePath } from "@/lib/pwa-surface";

const STORAGE_KEY = "af-pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function subscribe() {
  return () => undefined;
}

function useClient() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

function isMobile() {
  return window.matchMedia("(max-width: 768px)").matches || /iPhone|iPad|Android/i.test(navigator.userAgent);
}

function isIos() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function onBackupSurface() {
  return isBackupSurfacePath(window.location.pathname);
}

export function PwaInstallBanner() {
  const t = useTranslations("pwa");
  const isClient = useClient();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!isClient || dismissed) {
    return null;
  }

  if (localStorage.getItem(STORAGE_KEY) || isStandalone() || !isMobile() || !onBackupSurface()) {
    return null;
  }

  const ios = isIos();

  async function install() {
    if (!deferred) {
      return;
    }
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="pwa-install-title"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
      >
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">{t("eyebrow")}</p>
        <h2 id="pwa-install-title" className="mt-2 text-xl tracking-tight">
          {t("title")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{ios ? t("iosBody") : t("body")}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {!ios && deferred ? (
            <Button type="button" className="rounded-[10px]" onClick={() => void install()}>
              {t("install")}
            </Button>
          ) : null}
          <Button type="button" variant="outline" className="rounded-[10px]" onClick={dismiss}>
            {t("later")}
          </Button>
        </div>
      </div>
    </div>
  );
}
