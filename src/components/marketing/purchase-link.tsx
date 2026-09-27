"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { DocumentLink } from "@/components/marketing/cached-marketing-link";
import { useAccount } from "@/hooks/use-account";
import { accountServiceRows, hasActiveService } from "@/lib/owned-service";

export function PurchaseLink({
  planId,
  href,
  className,
  children,
}: {
  planId: string;
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const t = useTranslations("checkout");
  const { account } = useAccount();
  const owned = account ? hasActiveService(accountServiceRows(account), planId) : false;

  if (!owned) {
    return (
      <DocumentLink href={href} className={className}>
        {children}
      </DocumentLink>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        window.alert(t("alreadyOwned"));
      }}
    >
      {children}
    </button>
  );
}
