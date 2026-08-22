import { Link } from "@/i18n/navigation";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-sm font-medium tracking-tight">
      <span className="flex size-5 items-center justify-center rounded-[5px] border border-primary/30 bg-primary/10">
        <span className="size-1.5 rounded-full bg-primary" />
      </span>
      AcrossFlare
    </Link>
  );
}
