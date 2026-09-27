export function HeroGrain() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.38] mix-blend-overlay"
    >
      <defs>
        <filter id="hero-grain" x="0" y="0" width="160" height="160" filterUnits="userSpaceOnUse">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <pattern id="hero-grain-pattern" width="160" height="160" patternUnits="userSpaceOnUse">
          <rect width="160" height="160" filter="url(#hero-grain)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hero-grain-pattern)" />
    </svg>
  );
}
