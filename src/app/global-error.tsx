"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-[#090A0F] text-white">
        <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl tracking-tight">This page couldn&apos;t load</h1>
            <p className="max-w-sm text-sm text-white/60">Reload to try again, or go back.</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-[10px] bg-white px-4 py-2 text-sm font-medium text-black"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={() => window.location.assign(window.location.href)}
              className="rounded-[10px] border border-white/30 px-4 py-2 text-sm text-white"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
