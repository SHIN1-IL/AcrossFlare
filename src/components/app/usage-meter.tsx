import { cn } from "@/lib/utils";

export function UsageMeter({
  label,
  used,
  limit,
  unlimited = false,
}: {
  label: string;
  used: number;
  limit: number;
  unlimited?: boolean;
}) {
  const percent = unlimited ? 100 : Math.min(100, (used / Math.max(limit, 1)) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-foreground">
          {unlimited ? `${used.toFixed(used % 1 === 0 ? 0 : 1)} GB` : `${used} / ${limit} GB`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            unlimited ? "bg-primary" : percent >= 100 ? "bg-destructive" : "bg-primary"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
