"use client";

import { AdminShell } from "@/components/admin/admin-shell";

export function AdminAuthShell({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
