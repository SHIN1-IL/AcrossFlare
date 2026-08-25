import { getTranslations } from "next-intl/server";
import { MerchantDisclosure } from "@/components/marketing/merchant-disclosure";
import { MarketingShell } from "@/components/marketing/marketing-shell";

type LegalDoc = "terms" | "privacy";

type LegalSection = {
  id?: string;
  title: string;
  body: string;
};

export async function LegalPage({ doc }: { doc: LegalDoc }) {
  const t = await getTranslations("legal");
  const sections = t.raw(`${doc}Sections`) as LegalSection[];

  return (
    <MarketingShell>
      <article className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
          AcrossFlare
        </p>
        <h1 className="mt-3 text-3xl tracking-tight md:text-4xl">
          {doc === "terms" ? t("termsTitle") : t("privacyTitle")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("updated")}</p>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{t("disclaimer")}</p>
        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.id ?? section.title} id={section.id} className="scroll-mt-24">
              <h2 className="text-lg tracking-tight">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground whitespace-pre-line">
                {section.body}
              </p>
            </section>
          ))}
        </div>
        <div className="mt-12 border-t border-border pt-8">
          <MerchantDisclosure />
        </div>
      </article>
    </MarketingShell>
  );
}
