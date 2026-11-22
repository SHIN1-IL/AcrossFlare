export type SettlementCurrency = "KRW" | "USD";

function methodName(method: string) {
  return method.trim().toLowerCase();
}

/** Korean cards stay on PortOne. Alipay and every other card settle in USD. */
export function usesLemonCheckout(locale: string, method: string) {
  const name = methodName(method);
  if (name === "alipay") {
    return true;
  }

  return name === "card" && locale !== "ko";
}

export function settlementCurrency(locale: string, method: string): SettlementCurrency {
  return usesLemonCheckout(locale, method) ? "USD" : "KRW";
}
