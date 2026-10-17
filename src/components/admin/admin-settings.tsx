"use client";

import { useTranslations } from "next-intl";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { OwnerPasswordBanner } from "@/components/admin/owner-password-banner";
import { LocaleSwitcher } from "@/components/marketing/locale-switcher";
import { useSession } from "@/hooks/use-account";
import { Link } from "@/i18n/navigation";
import { isOwnerSession } from "@/lib/auth-types";

export function AdminSettings() {
  const t = useTranslations("admin");
  const tNav = useTranslations("nav");
  const session = useSession();
  const owner = isOwnerSession(session);

  if (!session) {
    return null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminPageHeader title={t("settingsTitle")} subtitle={t("settingsSubtitle")} />
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium">{t("settingsAccount")}</h2>
        <p className="font-mono text-sm">{session.email}</p>
        <p className="text-sm text-muted-foreground">{owner ? t("sessionRoleOwner") : t("sessionRoleStaff")}</p>
        {owner ? (
          <Link href="/admin/staff" className="inline-flex text-sm text-primary">
            {t("settingsStaffLink")}
          </Link>
        ) : null}
      </section>
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-medium">{tNav("language")}</h2>
        <LocaleSwitcher />
      </section>
      <OwnerPasswordBanner embedded showEnvHint={owner} />
    </div>
  );
}
