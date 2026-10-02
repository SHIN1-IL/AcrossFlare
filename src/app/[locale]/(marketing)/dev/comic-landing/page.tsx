import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { WhyBuyUiStoryPreview } from "@/components/marketing/why-buy-ui-story-preview";
import { resolveLocale } from "@/i18n/locale";

export const dynamic = "force-dynamic";

export default async function ComicLandingTestPage({
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
    <main className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Local only</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">메인 2페이지 · UI 스토리 프리뷰</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        폴드형 듀얼 화면으로 문제 → 해결을 보여줍니다. 전체 재생 후 5초 뒤 자동 반복됩니다. 사이트 본편에는 아직
        반영하지 않았습니다.
      </p>
      <div className="mt-6">
        <WhyBuyUiStoryPreview />
      </div>
    </main>
  );
}
