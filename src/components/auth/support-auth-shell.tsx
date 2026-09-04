"use client";

import { useEffect } from "react";
import { SupportZone } from "@/components/marketing/support-zone";
import { useHydrated, useSession, useSessionProbeDone } from "@/hooks/use-account";
import { usePathname, useRouter } from "@/i18n/navigation";

export function SupportAuthShell() {
  const hydrated = useHydrated();
  const probeDone = useSessionProbeDone();
  const session = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && probeDone && !session) {
      router.replace({ pathname: "/login", query: { next: pathname } });
    }
  }, [hydrated, pathname, probeDone, router, session]);

  if (!hydrated || !probeDone || !session) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-pulse rounded-full bg-primary/20" />
      </div>
    );
  }

  return <SupportZone />;
}
