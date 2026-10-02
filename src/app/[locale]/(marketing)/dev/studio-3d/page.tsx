import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ProductStudioLanding } from "@/components/marketing/product-studio-3d";
import { resolveLocale } from "@/i18n/locale";

export const dynamic = "force-dynamic";

export default async function Studio3dTestPage({
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
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">3D 노드 프리뷰 테스트</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Mac Studio처럼 스크롤하면 부품이 조립되는 시범입니다. Apple 자산이 아닌 AcrossFlare 오리지널 구조입니다.
        </p>
      </div>
      <ProductStudioLanding className="!snap-none" />
    </main>
  );
}
