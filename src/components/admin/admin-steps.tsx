import { Check, LoaderCircle } from "lucide-react";
import type { JobStep } from "@/lib/admin";
import { cn } from "@/lib/utils";

export function AdminSteps({
  steps,
  labels,
}: {
  steps: JobStep[];
  labels: Record<string, string>;
}) {
  return (
    <ol className="space-y-3">
      {steps.map((step) => {
        const done = step.status === "done";
        const current = step.status === "running";
        const failed = step.status === "failed";

        return (
          <li key={step.id} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border",
                failed && "border-destructive/40 bg-destructive/10 text-destructive",
                (done || current) && !failed && "border-primary/40 bg-primary/10 text-primary",
                step.status === "pending" && "border-border text-muted-foreground"
              )}
            >
              {done ? (
                <Check className="size-3.5" />
              ) : current ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : failed ? (
                <span className="size-1.5 rounded-full bg-current" />
              ) : (
                <span className="size-1 rounded-full bg-current" />
              )}
            </span>
            <span className={done || current || failed ? "text-foreground" : "text-muted-foreground"}>
              {labels[step.id] ?? step.id}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
