import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";

export function MarketingShell({
  children,
  deck = false,
}: {
  children: React.ReactNode;
  deck?: boolean;
}) {
  return (
    <div className={deck ? "home-deck flex min-h-dvh flex-col" : "flex min-h-dvh flex-col"}>
      <MarketingHeader />
      <main className={deck ? undefined : "flex-1"}>{children}</main>
      <MarketingFooter snap={deck} />
    </div>
  );
}
