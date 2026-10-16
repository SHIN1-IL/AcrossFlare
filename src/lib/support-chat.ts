import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import ko from "../../messages/ko.json";
import zh from "../../messages/zh.json";
import { routing, type AppLocale } from "@/i18n/routing";
import {
  BACKUP_FAQ_ITEMS,
  BACKUP_SETUP_STEPS,
  KARING_FAQ_ITEMS,
  KARING_INSTALL_PLATFORMS,
  KARING_SETUP_STEPS,
} from "@/lib/support-zone";

const SUPPORT_COPY = { en, ko, zh, ja } as const;

const LANGUAGE: Record<AppLocale, string> = {
  en: "English",
  ko: "Korean",
  zh: "Chinese",
  ja: "Japanese",
};

export const SUPPORT_CHAT_MAX_MESSAGES = 8;
export const SUPPORT_CHAT_MAX_CHARS = 800;
export const SUPPORT_CHAT_LIMIT = 20;
export const SUPPORT_CHAT_WINDOW_MS = 10 * 60 * 1000;
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

export type SupportChatTurn = {
  role: "user" | "assistant";
  text: string;
};

const hits = new Map<string, number[]>();

export function resetSupportChatLimits() {
  hits.clear();
}

export function geminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim() ?? "";
}

export function geminiModel() {
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
  return /^[a-zA-Z0-9._-]+$/.test(model) ? model : DEFAULT_GEMINI_MODEL;
}

export function supportKnowledge(locale: AppLocale) {
  const support = SUPPORT_COPY[locale].support;
  const install = KARING_INSTALL_PLATFORMS.map(
    (platform) => `${platform.id}: ${support.setup.install[platform.id]}`,
  ).join("\n");
  const setup = KARING_SETUP_STEPS.map(
    (step, index) =>
      `${index + 1}. ${support.setup.steps[step.id].title}\n${support.setup.steps[step.id].body}`,
  ).join("\n");
  const backup = BACKUP_SETUP_STEPS.map(
    (step, index) =>
      `${index + 1}. ${support.backup.steps[step.id].title}\n${support.backup.steps[step.id].body}`,
  ).join("\n");
  const faq = [...KARING_FAQ_ITEMS, ...BACKUP_FAQ_ITEMS]
    .map((item) => `Q: ${support.faq.items[item.id].q}\nA: ${support.faq.items[item.id].a}`)
    .join("\n");

  return [
    support.title,
    support.lead,
    `${support.downloads.title}\n${support.downloads.lead}`,
    `${support.setup.title}\n${support.setup.heading}\n${install}\n${setup}`,
    `${support.backup.title}\n${support.backup.heading}\n${backup}`,
    `${support.faq.title}\n${support.faq.helpTitle}\n${support.faq.helpBody}\n${faq}`,
  ].join("\n\n");
}

export function supportChatSystem(locale: AppLocale) {
  return [
    "You are the AcrossFlare support assistant on the public support page.",
    "Answer only from the support text below. It covers downloads, Karing setup, backup, and the FAQ.",
    "If the question is not covered, say you can only help with those topics and point to the matching section on this page.",
    "Never invent subscription URLs, passwords, node addresses, payment status, or account details.",
    "Never ask the visitor to paste a subscription link, password, or QR content.",
    "Links and email addresses in the visitor's messages were removed before you saw them.",
    `Reply in ${LANGUAGE[locale]}. Keep the answer under 120 words.`,
    "",
    "Support text:",
    supportKnowledge(locale),
  ].join("\n");
}

export function redactSupportChatText(text: string) {
  return text
    .replace(/https?:\/\/\S+/gi, "[link]")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b(?:[A-Za-z0-9+/]{32,}={0,2}|[A-Fa-f0-9]{32,})\b/g, "[secret]")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseSupportChatBody(
  body: unknown,
): { locale: AppLocale; messages: SupportChatTurn[] } | { error: "invalid" } {
  if (!body || typeof body !== "object") return { error: "invalid" };
  const record = body as { locale?: unknown; messages?: unknown };
  if (!routing.locales.includes(record.locale as AppLocale)) return { error: "invalid" };
  if (!Array.isArray(record.messages) || record.messages.length === 0) return { error: "invalid" };
  if (record.messages.length > SUPPORT_CHAT_MAX_MESSAGES) return { error: "invalid" };

  const messages: SupportChatTurn[] = [];
  for (const [index, message] of record.messages.entries()) {
    if (!message || typeof message !== "object") return { error: "invalid" };
    const turn = message as { role?: unknown; text?: unknown };
    const role = turn.role === "assistant" ? "assistant" : turn.role === "user" ? "user" : null;
    if (!role || typeof turn.text !== "string") return { error: "invalid" };
    if (role !== (index % 2 === 0 ? "user" : "assistant")) return { error: "invalid" };
    const text =
      role === "user" ? redactSupportChatText(turn.text) : turn.text.replace(/\s+/g, " ").trim();
    if (!text || text.length > SUPPORT_CHAT_MAX_CHARS) return { error: "invalid" };
    messages.push({ role, text });
  }

  if (messages[messages.length - 1]?.role !== "user") return { error: "invalid" };
  return { locale: record.locale as AppLocale, messages };
}

export function allowSupportChat(key: string, now = Date.now()) {
  const recent = (hits.get(key) ?? []).filter((time) => now - time < SUPPORT_CHAT_WINDOW_MS);
  if (recent.length >= SUPPORT_CHAT_LIMIT) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [storedKey, times] of hits) {
      if (times.every((time) => now - time >= SUPPORT_CHAT_WINDOW_MS)) hits.delete(storedKey);
    }
  }
  return true;
}

export function supportChatClientKey(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = headers.get("x-real-ip")?.trim();
  return (forwarded || real || "local").slice(0, 80);
}

export function readGeminiReply(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || !candidates[0] || typeof candidates[0] !== "object") return null;
  const content = (candidates[0] as { content?: { parts?: unknown } }).content;
  if (!Array.isArray(content?.parts)) return null;
  const text = content.parts
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const record = part as { text?: unknown; thought?: unknown };
      if (record.thought === true || typeof record.text !== "string") return "";
      return record.text;
    })
    .join("")
    .trim();
  return text || null;
}

export async function askGemini(
  input: {
    apiKey: string;
    model: string;
    system: string;
    messages: SupportChatTurn[];
  },
  fetchImpl: typeof fetch = fetch,
) {
  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": input.apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.system }] },
        contents: input.messages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.text }],
        })),
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      }),
      signal: AbortSignal.timeout(20000),
    },
  );
  if (!response.ok) return { error: "upstream" as const };
  const reply = readGeminiReply(await response.json());
  return reply ? { reply } : { error: "upstream" as const };
}

export async function askSupport(
  input: { locale: AppLocale; messages: SupportChatTurn[] },
  fetchImpl: typeof fetch = fetch,
) {
  const apiKey = geminiApiKey();
  if (!apiKey) return { error: "unconfigured" as const };
  try {
    return await askGemini(
      {
        apiKey,
        model: geminiModel(),
        system: supportChatSystem(input.locale),
        messages: input.messages,
      },
      fetchImpl,
    );
  } catch {
    return { error: "upstream" as const };
  }
}
