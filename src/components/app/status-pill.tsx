import { cn } from "@/lib/utils";

export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "ok" | "warn" | "neutral";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] tracking-wide uppercase",
        tone === "ok" && "border-primary/30 bg-primary/10 text-primary",
        tone === "warn" && "border-amber-400/30 bg-amber-400/10 text-amber-300",
        tone === "neutral" && "border-border bg-surface-2 text-muted-foreground"
      )}
    >
      {label}
    </span>
  );
}
