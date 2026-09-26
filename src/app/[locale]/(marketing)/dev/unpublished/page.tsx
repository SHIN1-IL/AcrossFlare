import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BackupSetupGuide } from "@/components/marketing/backup-guide";
import { KaringSetupGuide } from "@/components/marketing/karing-guide";
import { localePath } from "@/i18n/path";
import { resolveLocale } from "@/i18n/locale";
import { routing } from "@/i18n/routing";

export const dynamic = "force-dynamic";

const LOCALE_LABELS = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
  zh: "中文",
} as const;

export default async function UnpublishedPreviewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const t = await getTranslations("support");

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
        Local only
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("setup.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        acrossflare.com 에는 아직 없습니다. 지원 페이지에서 바뀐 설정 방법과 백업 안내입니다.
      </p>
      <nav className="mt-4 flex flex-wrap gap-2 text-sm">
        {routing.locales.map((item) => (
          <a
            key={item}
            href={localePath(item, "/dev/unpublished")}
            className={
              item === locale
                ? "rounded-full bg-primary px-3 py-1 text-primary-foreground"
                : "rounded-full border border-border px-3 py-1 text-muted-foreground"
            }
          >
            {LOCALE_LABELS[item]}
          </a>
        ))}
      </nav>

      <section className="mt-8 rounded-2xl border border-border/80 bg-card/70 p-6">
        <h2 className="text-xl tracking-tight">{t("setup.title")}</h2>
        <KaringSetupGuide activePlatform={null} />
      </section>

      <section className="mt-5 rounded-2xl border border-border/80 bg-card/70 p-6">
        <h2 className="text-xl tracking-tight">{t("backup.title")}</h2>
        <BackupSetupGuide />
      </section>
    </main>
  );
}
