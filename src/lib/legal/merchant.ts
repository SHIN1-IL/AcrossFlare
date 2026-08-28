function readEnv(name: string, fallback = "") {
  const value = (process.env[name] ?? "").trim();
  return value.length > 0 ? value : fallback;
}

export const MAIL_ORDER_PENDING = "구매안전확인증 발급 후 신고 예정";
export const DEFAULT_HOSTING_PROVIDER = "Cloudflare";
export const VAT_SIMPLIFIED = "부가가치세 간이과세자";

export type MerchantInfo = {
  serviceName: string;
  legalName: string;
  ceo: string;
  address: string;
  phone: string;
  email: string;
  businessNumber: string;
  vatStatus: string;
  vasNumber: string;
  mailOrderNumber: string;
  hostingProvider: string;
};

export function getMerchant(): MerchantInfo {
  return {
    serviceName: readEnv("LEGAL_SERVICE_NAME", "AcrossFlare"),
    legalName: readEnv("LEGAL_ENTITY_NAME", "어크로스툴(ACROSSTOOL)"),
    ceo: readEnv("LEGAL_CEO", "신일"),
    address: readEnv("LEGAL_ADDRESS", "강원특별자치도 양양군 서면 쌍솔배기길31-1"),
    phone: readEnv("LEGAL_PHONE", "070-8065-1258"),
    email: readEnv("LEGAL_EMAIL", "acrosstool@gmail.com"),
    businessNumber: readEnv("LEGAL_BUSINESS_NO", "163-13-03007"),
    vatStatus: VAT_SIMPLIFIED,
    vasNumber: readEnv("LEGAL_VAS_NO", "제 2-04-26-0006 호"),
    mailOrderNumber: readEnv("LEGAL_MAIL_ORDER_NO", MAIL_ORDER_PENDING),
    hostingProvider: readEnv("LEGAL_HOSTING_PROVIDER", DEFAULT_HOSTING_PROVIDER),
  };
}

export type MerchantRowId =
  | "serviceName"
  | "legalName"
  | "ceo"
  | "address"
  | "phone"
  | "email"
  | "businessNo"
  | "vatStatus"
  | "vasNo"
  | "mailOrderNo"
  | "hostingProvider";

export function merchantRows(merchant: MerchantInfo): Array<{ id: MerchantRowId; value: string }> {
  return (
    [
      { id: "serviceName", value: merchant.serviceName },
      { id: "legalName", value: merchant.legalName },
      { id: "ceo", value: merchant.ceo },
      { id: "address", value: merchant.address },
      { id: "phone", value: merchant.phone },
      { id: "email", value: merchant.email },
      { id: "businessNo", value: merchant.businessNumber },
      { id: "vatStatus", value: merchant.vatStatus },
      { id: "vasNo", value: merchant.vasNumber },
      { id: "mailOrderNo", value: merchant.mailOrderNumber },
      { id: "hostingProvider", value: merchant.hostingProvider },
    ] satisfies Array<{ id: MerchantRowId; value: string }>
  ).filter((row) => row.value.length > 0);
}
