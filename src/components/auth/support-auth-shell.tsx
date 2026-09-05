"use client";

import { useEffect } from "react";
import { useLocale } from "next-intl";
import { SupportZone } from "@/components/marketing/support-zone";
import { useHydrated, useSession, useSessionProbeDone } from "@/hooks/use-account";
import { usePathname } from "@/i18n/navigation";
import { localePath } from "@/i18n/path";

export function SupportAuthShell() {
  const hydrated = useHydrated();
  const probeDone = useSessionProbeDone();
  const session = useSession();
  const locale = useLocale();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && probeDone && !session) {
      window.location.replace(
        localePath(locale, `/login?next=${encodeURIComponent(pathname)}`)
      );
    }
  }, [hydrated, locale, pathname, probeDone, session]);

  if (!hydrated || !probeDone || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-pulse rounded-full bg-primary/20" />
      </div>
    );
  }

  return <SupportZone />;
}
