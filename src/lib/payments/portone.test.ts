import { describe, expect, it } from "vitest";
import { portoneCurrency, portoneCustomerName, portoneCustomerPhone, portoneLocale } from "@/lib/payments/portone";

describe("portone currency and locale", () => {
  it("uses the PortOne CURRENCY_ prefix the browser SDK expects", () => {
    expect(portoneCurrency("KRW")).toBe("CURRENCY_KRW");
    expect(portoneCurrency("usd")).toBe("CURRENCY_USD");
    expect(portoneCurrency("CURRENCY_KRW")).toBe("CURRENCY_KRW");
  });

  it("maps store locales to PortOne checkout locales", () => {
    expect(portoneLocale("ko")).toBe("KO_KR");
    expect(portoneLocale("zh")).toBe("ZH_CN");
    expect(portoneLocale("ja")).toBe("JA_JP");
    expect(portoneLocale("en")).toBe("EN_US");
  });

  it("derives a customer name from the account email", () => {
    expect(portoneCustomerName("shin@acrosstool.com")).toBe("shin");
  });

  it("normalizes Korean mobiles for Inicis V2", () => {
    expect(portoneCustomerPhone("010-1234-5678")).toBe("010-1234-5678");
    expect(portoneCustomerPhone("01012345678")).toBe("010-1234-5678");
    expect(portoneCustomerPhone("+82 10-1234-5678")).toBe("010-1234-5678");
    expect(portoneCustomerPhone("070-8065-1258")).toBeNull();
    expect(portoneCustomerPhone("")).toBeNull();
  });
});
