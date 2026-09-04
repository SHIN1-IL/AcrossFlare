"use client";

import { AppShell } from "@/components/app/app-shell";
import { MerchantDisclosure } from "@/components/marketing/merchant-disclosure";

export function AppAuthShell({ children }: { children: React.ReactNode }) {
  return <AppShell merchant={<MerchantDisclosure />}>{children}</AppShell>;
}
