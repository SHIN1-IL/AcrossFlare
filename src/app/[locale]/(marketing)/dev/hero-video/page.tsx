import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { SpiderWebLanding } from "@/components/marketing/spider-web-landing";
import { resolveLocale } from "@/i18n/locale";

export const dynamic = "force-dynamic";

export default async function HeroVideoTestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  return <SpiderWebLanding className="!mt-0 !snap-none" />;
}
