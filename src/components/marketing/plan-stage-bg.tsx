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
    <svg className="absolute inset-0 size-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="af-dots" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.1" fill="#10b981" opacity="0.35" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#af-dots)" />
      <circle cx="78%" cy="28%" r="180" fill="#10b981" opacity="0.08" />
    </svg>
  );
}

function LineGrid() {
  return (
    <svg className="absolute inset-0 size-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="af-grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M48 0H0V48" fill="none" stroke="#10b981" strokeWidth="0.7" opacity="0.22" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#af-grid)" />
    </svg>
  );
}

function RingField() {
  return (
    <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      <circle cx="50" cy="38" r="18" fill="none" stroke="#10b981" strokeWidth="0.35" opacity="0.35" />
      <circle cx="50" cy="38" r="28" fill="none" stroke="#10b981" strokeWidth="0.3" opacity="0.22" />
      <circle cx="50" cy="38" r="40" fill="none" stroke="#10b981" strokeWidth="0.25" opacity="0.14" />
    </svg>
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
