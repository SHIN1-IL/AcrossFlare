import { afterEach, describe, expect, it } from "vitest";
import { getMerchant, merchantRows } from "@/lib/legal/merchant";

describe("legal/merchant", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  function clearLegalEnv() {
    delete process.env.LEGAL_SERVICE_NAME;
    delete process.env.LEGAL_ENTITY_NAME;
    delete process.env.LEGAL_CEO;
    delete process.env.LEGAL_ADDRESS;
    delete process.env.LEGAL_PHONE;
    delete process.env.LEGAL_EMAIL;
    delete process.env.LEGAL_BUSINESS_NO;
    delete process.env.LEGAL_VAS_NO;
    delete process.env.LEGAL_MAIL_ORDER_NO;
  }

  it("uses the registered merchant defaults and hides an empty 통신판매업 number", () => {
    clearLegalEnv();

    expect(merchantRows(getMerchant())).toEqual([
      { id: "serviceName", value: "AcrossFlare" },
      { id: "legalName", value: "어크로스툴(ACROSSTOOL)" },
      { id: "ceo", value: "신일" },
      { id: "address", value: "강원특별자치도 양양군 서면 쌍솔배기길31-1" },
      { id: "phone", value: "070-8065-1258" },
      { id: "email", value: "acrosstool@gmail.com" },
      { id: "businessNo", value: "163-13-03007" },
      { id: "vasNo", value: "제 2-04-26-0006 호" },
    ]);
  });

  it("uses defaults when env is blank instead of hiding the field", () => {
    process.env.LEGAL_PHONE = "  ";
    expect(merchantRows(getMerchant()).find((row) => row.id === "phone")?.value).toBe("070-8065-1258");
  });

  it("lets env override fields including a later phone number", () => {
    process.env.LEGAL_PHONE = "070-000-0000";
    process.env.LEGAL_MAIL_ORDER_NO = "제2026-양양-0000호";

    const rows = merchantRows(getMerchant());
    expect(rows.find((row) => row.id === "phone")?.value).toBe("070-000-0000");
    expect(rows.find((row) => row.id === "mailOrderNo")?.value).toBe("제2026-양양-0000호");
  });
});
