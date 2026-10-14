import { setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { BOARD_ART } from "@/lib/board-art";

export const dynamic = "force-dynamic";

/** Reference pane: shows parked motherboard art while site-wide BOARD_ART_ENABLED is false. */
export default async function BoardArtReferencePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);

  return (
    <main className="min-h-dvh bg-[#0e1014] px-4 py-10 text-[#e4e4e7]">
      <div className="mx-auto max-w-5xl space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Motherboard art (parked)</h1>
        <p className="text-sm text-[#a1a1aa]">
          Site-wide plates are off via BOARD_ART_ENABLED. This page still shows the optimized
          WebP so you can compare look vs speed.
        </p>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element -- reference-only; bypasses BoardArt kill-switch */}
          <img
            src={BOARD_ART.webp1920}
            alt="AcrossFlare motherboard plate"
            width={BOARD_ART.width}
            height={BOARD_ART.height}
            className="h-auto w-full object-cover"
          />
        </div>
        <p className="font-mono text-xs text-[#71717a]">{BOARD_ART.webp1920}</p>
      </div>
    </main>
  );
}
