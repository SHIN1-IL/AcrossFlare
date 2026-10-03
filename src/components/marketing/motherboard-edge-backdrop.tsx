"use client";

const BOARD_SRC = "/marketing/circuit-preview.jpg?v=22";

/**
 * Page-1 motherboard visible only at the viewport rim.
 * Center stays clear so phone previews on pages 2–3 stay uncluttered.
 */
export function MotherboardEdgeBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[#14181e]" />
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.72,
          WebkitMaskImage:
            "radial-gradient(ellipse 56% 62% at 50% 46%, transparent 0%, transparent 46%, rgba(0,0,0,0.5) 72%, #000 100%)",
          maskImage:
            "radial-gradient(ellipse 56% 62% at 50% 46%, transparent 0%, transparent 46%, rgba(0,0,0,0.5) 72%, #000 100%)",
        }}
      >
        <img
          src={BOARD_SRC}
          alt=""
          draggable={false}
          className="absolute inset-0 size-full object-cover opacity-[0.48] select-none"
          style={{ filter: "brightness(0.62) contrast(0.9) saturate(0.42)" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(226,232,240,0.04),transparent_40%,rgba(0,0,0,0.18))]" />
        <div className="absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.1),transparent_55%)]" />
        <div
          className="absolute -top-[12%] -right-[8%] h-[48%] w-[46%]"
          style={{
            background:
              "radial-gradient(ellipse 72% 58% at 70% 32%, rgba(52,211,153,0.18) 0%, rgba(16,185,129,0.08) 38%, transparent 72%)",
            filter: "blur(28px)",
          }}
        />
      </div>
    </div>
  );
}
