import { Link } from "@/i18n/navigation";

export function Logo({ showWordmark = true }: { showWordmark?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="AcrossFlare"
      className="group flex items-center gap-2.5 text-sm font-medium tracking-tight"
    >
      <span className="relative size-9 shrink-0 overflow-hidden rounded-[6px] bg-primary transition-transform duration-200 group-hover:scale-105">
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <rect
            x="1.5"
            y="1.5"
            width="61"
            height="61"
            rx="12"
            fill="#10b981"
            stroke="#10b981"
            strokeWidth="3"
          />
          <text
            x="14"
            y="45"
            fill="#f5f5f5"
            fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
            fontWeight="700"
            fontSize="34"
          >
            A
          </text>
          <text
            x="38"
            y="27"
            fill="#f5f5f5"
            fontFamily="system-ui, -apple-system, 'Segoe UI', sans-serif"
            fontWeight="700"
            fontSize="17"
          >
            f
          </text>
        </svg>
      </span>
      {showWordmark ? "AcrossFlare" : null}
    </Link>
  );
}
