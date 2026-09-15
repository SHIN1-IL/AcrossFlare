import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { SessionProvider } from "@/components/auth/session-provider";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { resolveLocale } from "@/i18n/locale";
import { CONSOLE_MESSAGE_KEYS, pickMessages } from "@/i18n/messages";

export default async function ConsoleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = await resolveLocale(params);
  setRequestLocale(locale);
  const messages = pickMessages(await getMessages(), CONSOLE_MESSAGE_KEYS);

  return (
    <NextIntlClientProvider messages={messages}>
      <SessionProvider>
        <PwaProvider />
        {children}
      </SessionProvider>
    </NextIntlClientProvider>
  );
}
