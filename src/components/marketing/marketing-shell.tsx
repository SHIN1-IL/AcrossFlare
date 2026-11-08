import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";

export function MarketingShell({
  children,
  deck = false,
  footer = true,
}: {
  children: React.ReactNode;
  deck?: boolean;
  footer?: boolean;
}) {
  return (
    <div className={deck ? "home-deck flex min-h-dvh flex-col" : "flex min-h-dvh flex-col"}>
      <MarketingHeader />
      <main className={deck ? undefined : "flex-1"}>{children}</main>
      {footer ? <MarketingFooter snap={deck} /> : null}
    </div>
  );
}
