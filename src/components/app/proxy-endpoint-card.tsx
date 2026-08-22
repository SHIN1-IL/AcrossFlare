import { CopyField } from "@/components/app/copy-field";

export function ProxyEndpointCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm">{title}</p>
      <div className="mt-3">
        <CopyField label={title} value={value} />
      </div>
    </div>
  );
}
