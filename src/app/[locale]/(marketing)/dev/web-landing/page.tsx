import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CircuitPreview } from "@/components/marketing/circuit-preview";
import { SpiderWebLandingPreview } from "@/components/marketing/spider-web-landing-preview";
import { WhyBuyUiStoryPreview } from "@/components/marketing/why-buy-ui-story-preview";
import { resolveLocale } from "@/i18n/locale";

export const dynamic = "force-dynamic";

export default async function WebLandingTestPage({
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
    <main className="mx-auto max-w-5xl space-y-12 px-4 py-8">
      <div>
        <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Local only</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">메인 홈 테스트 (1·2페이지)</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          1페이지 메인보드(LED 프리뷰 + 커서 리빌) · 2페이지 UI 스토리는 `/dev/comic-landing`에서 스크롤
          스토리로 확인하세요.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-foreground/80">1페이지 · Circuit LED 프리뷰</h2>
        <CircuitPreview className="!bg-transparent !px-0 !py-0" />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-foreground/80">1페이지 · 커서 리빌</h2>
        <SpiderWebLandingPreview />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-foreground/80">2페이지 · UI 스토리 (타이머 미리보기)</h2>
        <WhyBuyUiStoryPreview />
      </section>
    </main>
  );
}
