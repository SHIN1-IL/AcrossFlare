function StageBackdrop({ variant }: { variant: number }) {
  const index = variant % 6;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#07080c]" />
      {index === 0 ? <DotsField /> : null}
      {index === 1 ? <LineGrid /> : null}
      {index === 2 ? <RingField /> : null}
      {index === 3 ? <DiagonalHatch /> : null}
      {index === 4 ? <OrbField /> : null}
      {index === 5 ? <HorizonGlow /> : null}
      <div className="absolute inset-0 bg-gradient-to-t from-[#07080c] via-[#07080c]/35 to-transparent" />
    </div>
  );
}

function DotsField() {
  return (
    <>
      <svg className="absolute inset-0 size-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="af-dots" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.1" fill="#10b981" opacity="0.35" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#af-dots)" />
      </svg>
      <div className="absolute top-[32%] left-[76%] size-[360px] -translate-x-1/2 -translate-y-1/2">
        <div className="size-full rounded-full bg-primary/[0.08] motion-reduce:animate-none animate-slow-bounce" />
      </div>
    </>
  );
}

function LineGrid() {
  const orbit =
    "M 16 75 H 64 L 76 63 V 26 H 160 L 172 38 H 220 V 26 H 292 L 304 38 V 75 L 304 112 H 280 L 268 124 H 172 L 160 136 H 76 L 64 124 H 28 L 16 112 V 75";

  return (
    <>
      <svg className="absolute inset-0 size-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="af-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M48 0H0V48" fill="none" stroke="#10b981" strokeWidth="0.7" opacity="0.16" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#af-grid)" />
      </svg>
      <svg
        className="absolute inset-x-[2%] top-[2%] h-[44%] w-[96%] overflow-visible [@media(min-height:52rem)]:top-[4%] [@media(min-height:52rem)]:h-[52%] [@media(min-height:64rem)]:top-[5%] [@media(min-height:64rem)]:h-[58%]"
        viewBox="0 0 320 150"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <rect
          x="8"
          y="10"
          width="304"
          height="130"
          rx="3"
          stroke="#64748b"
          strokeWidth="0.35"
          opacity="0.22"
        />

        <rect x="86" y="42" width="58" height="58" rx="1.2" stroke="#38bdf8" strokeWidth="0.55" opacity="0.38" />
        <rect x="94" y="50" width="42" height="42" rx="0.6" stroke="#38bdf8" strokeWidth="0.3" opacity="0.22" />
        <path d="M100 56H130M100 64H130M100 72H130M100 80H130" stroke="#38bdf8" strokeWidth="0.22" opacity="0.18" />
        <rect x="86" y="42" width="4" height="4" fill="#38bdf8" opacity="0.28" />

        <rect x="32" y="36" width="11" height="78" rx="0.8" stroke="#38bdf8" strokeWidth="0.4" opacity="0.28" />
        <rect x="48" y="36" width="11" height="78" rx="0.8" stroke="#38bdf8" strokeWidth="0.4" opacity="0.28" />
        <path d="M34 44H41M34 52H41M34 60H41M34 68H41M34 76H41M34 84H41M34 92H41M34 100H41" stroke="#38bdf8" strokeWidth="0.2" opacity="0.2" />
        <path d="M50 44H57M50 52H57M50 60H57M50 68H57M50 76H57M50 84H57M50 92H57M50 100H57" stroke="#38bdf8" strokeWidth="0.2" opacity="0.2" />

        <rect x="228" y="54" width="48" height="38" rx="1" stroke="#10b981" strokeWidth="0.55" opacity="0.38" />
        <rect x="236" y="62" width="32" height="22" stroke="#10b981" strokeWidth="0.28" opacity="0.22" />
        <path d="M240 68H264M240 74H264M240 80H264" stroke="#10b981" strokeWidth="0.22" opacity="0.18" />

        <rect x="96" y="128" width="128" height="7" rx="0.6" stroke="#10b981" strokeWidth="0.35" opacity="0.24" />
        <path d="M104 128V135M112 128V135M120 128V135M128 128V135M136 128V135M144 128V135M152 128V135M160 128V135M168 128V135M176 128V135M184 128V135M192 128V135M200 128V135M208 128V135" stroke="#10b981" strokeWidth="0.2" opacity="0.18" />

        <path d="M144 58H228M144 65H228M144 72H228" stroke="#94a3b8" strokeWidth="0.28" opacity="0.2" />
        <path d="M115 100V128M123 100V128M131 100V128" stroke="#94a3b8" strokeWidth="0.28" opacity="0.16" />
        <path d="M18 36H28V28H52" stroke="#38bdf8" strokeWidth="0.35" opacity="0.22" />
        <path d="M276 54H292V36H304" stroke="#10b981" strokeWidth="0.35" opacity="0.22" />
        <path d="M64 100H76L88 112V128" stroke="#38bdf8" strokeWidth="0.3" opacity="0.18" />
        <path d="M276 92H252L240 104V128" stroke="#10b981" strokeWidth="0.3" opacity="0.18" />
        <path d="M59 48H86M59 56H86M59 64H86M59 72H86M59 80H86" stroke="#38bdf8" strokeWidth="0.22" opacity="0.2" />
        <path d="M144 88H188L200 76H228" stroke="#10b981" strokeWidth="0.28" opacity="0.2" />
        <path d="M144 95H180L192 83" stroke="#10b981" strokeWidth="0.28" opacity="0.16" />
        <path d="M86 36H100L112 24H148" stroke="#38bdf8" strokeWidth="0.28" opacity="0.2" />
        <path d="M252 54V44H276" stroke="#10b981" strokeWidth="0.28" opacity="0.18" />
        <rect x="188" y="28" width="22" height="14" rx="0.6" stroke="#10b981" strokeWidth="0.35" opacity="0.26" />
        <rect x="214" y="28" width="14" height="14" rx="0.6" stroke="#10b981" strokeWidth="0.35" opacity="0.26" />
        <rect x="18" y="108" width="18" height="12" rx="0.5" stroke="#38bdf8" strokeWidth="0.3" opacity="0.22" />
        <circle cx="24" cy="48" r="2.2" stroke="#38bdf8" strokeWidth="0.3" opacity="0.2" />
        <circle cx="24" cy="58" r="2.2" stroke="#38bdf8" strokeWidth="0.3" opacity="0.2" />
        <circle cx="24" cy="68" r="2.2" stroke="#38bdf8" strokeWidth="0.3" opacity="0.2" />

        <circle cx="28" cy="28" r="1.5" stroke="#38bdf8" strokeWidth="0.35" opacity="0.3" />
        <circle cx="52" cy="28" r="1.5" stroke="#38bdf8" strokeWidth="0.35" opacity="0.3" />
        <circle cx="144" cy="58" r="1.3" stroke="#94a3b8" strokeWidth="0.3" opacity="0.28" />
        <circle cx="228" cy="58" r="1.3" stroke="#94a3b8" strokeWidth="0.3" opacity="0.28" />
        <circle cx="115" cy="100" r="1.3" stroke="#94a3b8" strokeWidth="0.3" opacity="0.24" />
        <circle cx="292" cy="36" r="1.5" stroke="#10b981" strokeWidth="0.35" opacity="0.3" />
        <circle cx="304" cy="36" r="1.5" stroke="#10b981" strokeWidth="0.35" opacity="0.3" />
        <circle cx="76" cy="26" r="1.4" stroke="#38bdf8" strokeWidth="0.3" opacity="0.28" />
        <circle cx="172" cy="38" r="1.4" stroke="#94a3b8" strokeWidth="0.3" opacity="0.26" />
        <circle cx="268" cy="124" r="1.4" stroke="#10b981" strokeWidth="0.3" opacity="0.28" />
        <circle cx="76" cy="136" r="1.4" stroke="#38bdf8" strokeWidth="0.3" opacity="0.24" />

        <path d={orbit} stroke="#64748b" strokeWidth="0.45" opacity="0.28" />
        <path d={orbit} stroke="#38bdf8" strokeWidth="0.45" opacity="0.14" />

        <circle
          cx="16"
          cy="75"
          r="2.4"
          fill="#38bdf8"
          className="origin-center motion-reduce:animate-none animate-hybrid-pulse"
          style={{ transformBox: "fill-box" }}
        />
        <circle cx="16" cy="75" r="4.2" stroke="#38bdf8" strokeWidth="0.3" opacity="0.22" />
        <circle
          cx="304"
          cy="75"
          r="2.4"
          fill="#10b981"
          className="origin-center motion-reduce:animate-none animate-hybrid-pulse-alt"
          style={{ transformBox: "fill-box" }}
        />
        <circle cx="304" cy="75" r="4.2" stroke="#10b981" strokeWidth="0.3" opacity="0.22" />

        <circle
          r="1.5"
          fill="#38bdf8"
          className="motion-reduce:animate-none animate-hybrid-orbit"
          style={{
            offsetPath: `path("${orbit}")`,
            offsetRotate: "0deg",
          }}
        />
        <circle
          r="1.5"
          fill="#10b981"
          className="motion-reduce:animate-none animate-hybrid-orbit-rev"
          style={{
            offsetPath: `path("${orbit}")`,
            offsetRotate: "0deg",
          }}
        />
      </svg>
    </>
  );
}

function RingField() {
  const ringCount = 8;
  const duration = 22;

  return (
    <div className="absolute top-[34%] left-1/2 -translate-x-1/2 -translate-y-1/2">
      <svg
        className="size-[56vmin] overflow-visible"
        viewBox="0 0 80 80"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <filter id="af-neon" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.35" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {Array.from({ length: ringCount }, (_, index) => (
          <circle
            key={index}
            cx="40"
            cy="40"
            r="16"
            stroke="#10b981"
            strokeWidth="0.2"
            filter="url(#af-neon)"
            className="origin-center motion-reduce:hidden animate-tunnel-ring"
            style={{
              transformBox: "fill-box",
              animationDuration: `${duration}s`,
              animationDelay: `${(index * duration) / ringCount - duration}s`,
            }}
          />
        ))}
      </svg>
    </div>
  );
}

function DiagonalHatch() {
  return (
    <div
      className="absolute inset-0 opacity-40"
      style={{
        backgroundImage:
          "repeating-linear-gradient(118deg, transparent 0 18px, rgb(16 185 129 / 0.12) 18px 19px)",
      }}
    />
  );
}

function OrbField() {
  return (
    <>
      <div className="absolute -left-24 top-[18%] size-[28rem] rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute -right-16 top-[42%] size-[22rem] rounded-full bg-primary/10 blur-3xl" />
    </>
  );
}

function HorizonGlow() {
  return (
    <div className="absolute inset-x-[-10%] top-[42%] h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
  );
}

export { StageBackdrop };
