import { afterEach, describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import ja from "../../messages/ja.json";
import ko from "../../messages/ko.json";
import zh from "../../messages/zh.json";
import { routing } from "@/i18n/routing";
import {
  SUPPORT_CHAT_LIMIT,
  allowSupportChat,
  askGemini,
  askSupport,
  geminiModel,
  parseSupportChatBody,
  readGeminiReply,
  redactSupportChatText,
  resetSupportChatLimits,
  supportChatSystem,
  supportKnowledge,
} from "@/lib/support-chat";

const copies = { en, ko, ja, zh };

describe("support chat knowledge", () => {
  it("answers from each locale's public support text and leaves preview chrome out", () => {
    for (const locale of routing.locales) {
      const knowledge = supportKnowledge(locale);
      const copy = copies[locale];
      expect(knowledge).toContain(copy.support.faq.items.playStore.a);
      expect(knowledge).toContain(copy.support.backup.steps.open.body);
      expect(knowledge).not.toContain("Keep Diversion Rules");
      expect(copy.support.chat.title.length).toBeGreaterThan(0);
      expect(supportChatSystem(locale)).toContain(knowledge);
    }
  });
});

describe("support chat request", () => {
  afterEach(() => {
    resetSupportChatLimits();
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });

  it("keeps a short user question and removes links, emails, and secrets", () => {
    const parsed = parseSupportChatBody({
      locale: "ko",
      messages: [
        {
          role: "user",
          text: "프로필이 안 열려요 https://example.com/sub/secret user@example.com aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        },
      ],
    });
    expect(parsed).toEqual({
      locale: "ko",
      messages: [{ role: "user", text: "프로필이 안 열려요 [link] [email] [secret]" }],
    });
    expect(redactSupportChatText("  hello   ")).toBe("hello");
  });

  it("rejects history that does not alternate from the visitor", () => {
    expect(parseSupportChatBody({ locale: "en", messages: [] })).toEqual({ error: "invalid" });
    expect(
      parseSupportChatBody({
        locale: "en",
        messages: [{ role: "assistant", text: "hello" }],
      }),
    ).toEqual({ error: "invalid" });
    expect(parseSupportChatBody({ locale: "fr", messages: [{ role: "user", text: "hi" }] })).toEqual({
      error: "invalid",
    });
  });

  it("allows a short burst and then asks the visitor to wait", () => {
    for (let index = 0; index < SUPPORT_CHAT_LIMIT; index += 1) {
      expect(allowSupportChat("203.0.113.5", 1_000)).toBe(true);
    }
    expect(allowSupportChat("203.0.113.5", 1_000)).toBe(false);
    expect(allowSupportChat("203.0.113.5", 1_000 + 10 * 60 * 1000)).toBe(true);
  });
});

describe("gemini reply", () => {
  afterEach(() => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });

  it("reads the answer and skips hidden reasoning text", () => {
    expect(
      readGeminiReply({
        candidates: [
          {
            content: {
              parts: [
                { thought: true, text: "draft" },
                { text: " Play Store에는 없습니다. " },
              ],
            },
          },
        ],
      }),
    ).toBe("Play Store에는 없습니다.");
    expect(readGeminiReply({ candidates: [] })).toBeNull();
  });

  it("posts only the support prompt and redacted turns", async () => {
    const seen: { url: string; headers: Headers; body: string } = {
      url: "",
      headers: new Headers(),
      body: "",
    };
    const fetchImpl: typeof fetch = async (input, init) => {
      seen.url = String(input);
      seen.headers = new Headers(init?.headers);
      seen.body = String(init?.body);
      return new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "다운로드 버튼을 누르세요." }] } }] }),
        { status: 200 },
      );
    };

    const result = await askGemini(
      {
        apiKey: "test-key",
        model: "gemini-3.5-flash-lite",
        system: "support only",
        messages: [{ role: "user", text: "설치 방법" }],
      },
      fetchImpl,
    );

    expect(result).toEqual({ reply: "다운로드 버튼을 누르세요." });
    expect(seen.url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    );
    expect(seen.headers.get("x-goog-api-key")).toBe("test-key");
    const body = JSON.parse(seen.body) as {
      systemInstruction: { parts: Array<{ text: string }> };
      contents: Array<{ role: string; parts: Array<{ text: string }> }>;
    };
    expect(body.systemInstruction.parts[0]?.text).toBe("support only");
    expect(body.contents).toEqual([{ role: "user", parts: [{ text: "설치 방법" }] }]);
  });

  it("stays quiet when the API key is missing", async () => {
    let called = false;
    const result = await askSupport(
      { locale: "ko", messages: [{ role: "user", text: "설치" }] },
      async () => {
        called = true;
        return new Response("{}", { status: 200 });
      },
    );
    expect(result).toEqual({ error: "unconfigured" });
    expect(called).toBe(false);
    expect(geminiModel()).toBe("gemini-3.5-flash-lite");
  });
});
