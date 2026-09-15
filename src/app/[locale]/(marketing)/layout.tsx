import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale";
import { MARKETING_MESSAGE_KEYS, pickMessages } from "@/i18n/messages";

export default async function MarketingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const messages = pickMessages(await getMessages(), MARKETING_MESSAGE_KEYS);

  return <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>;
}
