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
    <main className="min-h-dvh bg-[#14181e]">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Local only</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">메인 2페이지 · UI 스토리</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          처음부터 폰 화면 + 첫 프리뷰 자동재생. 스크롤할 때마다 다음 프리뷰. 좁은 폰은 거의 전체화면, 일반
          폰은 세로 폰 프레임, 노트북·폴드는 기존 Fold 프레임.
        </p>
      </div>
      <WhyBuyUiStoryPreview live className="!snap-none" />
    </main>
  );
}
