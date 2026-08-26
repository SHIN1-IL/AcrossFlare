"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import {
  ADMIN_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
  type AdminPermission,
} from "@/lib/admin-permissions";

type StaffUser = {
  id: string;
  email: string;
  role: "USER" | "STAFF";
  permissions: AdminPermission[];
  createdAt: string;
};

const PERM_KEYS: Record<AdminPermission, "permCustomers" | "permPlans" | "permCodes" | "permProvision" | "permNodes"> =
  {
    customers: "permCustomers",
    plans: "permPlans",
    codes: "permCodes",
    provision: "permProvision",
    nodes: "permNodes",
  };

export function StaffManager() {
  const t = useTranslations("admin");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/v1/admin/staff", { credentials: "include" });
    const data = (await response.json().catch(() => ({}))) as {
      ownerEmail?: string;
      staff?: StaffUser[];
      error?: string;
    };
    if (!response.ok) {
      setError(t("required"));
      return;
    }
    setOwnerEmail(data.ownerEmail ?? "");
    setStaff(data.staff ?? []);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(id: string, role: "STAFF" | "USER", permissions?: AdminPermission[]) {
    setPending(id);
    setError("");
    try {
      const response = await fetch("/api/v1/admin/staff", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role, permissions }),
      });
      if (!response.ok) {
        setError(t("required"));
        return;
      }
      await load();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <AdminPageHeader title={t("staffTitle")} subtitle={t("staffSubtitle")} />
      {ownerEmail ? (
        <p className="mb-4 font-mono text-xs text-muted-foreground">{t("staffOwnerHint", { email: ownerEmail })}</p>
      ) : null}
      {error ? <p className="mb-4 text-sm text-destructive">{error}</p> : null}

      {staff.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-8 text-sm text-muted-foreground">
          {t("staffEmpty")}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">{t("email")}</th>
                <th className="px-4 py-3 font-medium">{t("role")}</th>
                <th className="px-4 py-3 font-medium">{t("staffPermissions")}</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {staff.map((user) => {
                const busy = pending === user.id;
                return (
                  <tr key={user.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{user.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.role === "STAFF" ? t("staffRoleStaff") : t("staffRoleUser")}
                    </td>
                    <td className="px-4 py-3">
                      {user.role === "STAFF" ? (
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {ADMIN_PERMISSIONS.map((permission) => (
                            <label key={permission} className="flex items-center gap-1.5 text-xs">
                              <input
                                type="checkbox"
                                className="size-3.5 accent-primary"
                                disabled={busy}
                                checked={user.permissions.includes(permission)}
                                onChange={(event) => {
                                  const next = event.target.checked
                                    ? [...user.permissions, permission]
                                    : user.permissions.filter((item) => item !== permission);
                                  void save(user.id, "STAFF", next);
                                }}
                              />
                              {t(PERM_KEYS[permission])}
                            </label>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.role === "STAFF" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-[10px]"
                          disabled={busy}
                          onClick={() => void save(user.id, "USER")}
                        >
                          {t("staffDemote")}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-[10px]"
                          disabled={busy}
                          onClick={() => void save(user.id, "STAFF", DEFAULT_STAFF_PERMISSIONS)}
                        >
                          {t("staffPromote")}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
