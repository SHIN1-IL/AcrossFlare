type MessageTree = Record<string, unknown>;

export const MARKETING_MESSAGE_KEYS = [
  "nav",
  "footer",
  "productNotice",
  "legal",
  "pricing",
  "planSlides",
  "workspace",
  "services",
  "auth",
  "common",
  "errors",
  "support",
] as const;

export const CONSOLE_MESSAGE_KEYS = [
  ...MARKETING_MESSAGE_KEYS,
  "app",
  "admin",
  "checkout",
  "pwa",
] as const;

export function pickMessages<T extends MessageTree>(messages: T, keys: readonly string[]): T {
  const picked = {} as T;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(messages, key)) {
      (picked as MessageTree)[key] = messages[key];
    }
  }
  return picked;
}
