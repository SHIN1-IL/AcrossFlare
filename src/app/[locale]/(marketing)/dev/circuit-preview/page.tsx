import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { CircuitPreview } from "@/components/marketing/circuit-preview";
import { resolveLocale } from "@/i18n/locale";

export const dynamic = "force-dynamic";

export default async function CircuitPreviewPage({
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
    <main className="min-h-dvh bg-black">
      <div className="mx-auto max-w-5xl px-4 pt-8">
        <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">Local only</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">1페이지 메인보드 프리뷰</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          새 planar 기판 + 녹색 LED 인디케이터. 커서 리빌 홈 1페이지에 붙이기 전 확인용.
        </p>
      </div>
      <CircuitPreview />
    </main>
  );
}
