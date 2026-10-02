import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ConsoleKaringStory } from "@/components/marketing/console-karing-story";
import { resolveLocale } from "@/i18n/locale";

export const dynamic = "force-dynamic";

export default async function ConsoleKaringTestPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  return (
    <main className="min-h-dvh bg-[#14181e]">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Local only</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">콘솔 → Karing 스토리 테스트</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          스크롤: 콘솔+QR → 핸드폰 확대 → 적색 버튼 클릭 → 녹색 가동. 개인정보는 OO 마스킹.
        </p>
      </div>
      <ConsoleKaringStory className="!snap-none" />
    </main>
  );
}
