export type PortOnePayMethod = "CARD" | "ALIPAY";

export type PortOneCheckout = {
  storeId: string;
  channelKey: string;
  paymentId: string;
  orderName: string;
  totalAmount: number;
  currency: string;
  payMethod: PortOnePayMethod;
  redirectUrl: string;
  locale: string;
  customer: {
    email: string;
    fullName: string;
    phoneNumber: string;
  };
};

export function portoneCurrency(currency: string) {
  const upper = currency.trim().toUpperCase();
  if (!upper) {
    return "CURRENCY_KRW";
  }

  return upper.startsWith("CURRENCY_") ? upper : `CURRENCY_${upper}`;
}

export function portoneLocale(locale: string) {
  switch (locale) {
    case "zh":
      return "ZH_CN";
    case "ja":
      return "JA_JP";
    case "en":
      return "EN_US";
    default:
      return "KO_KR";
  }
}

export function portoneCustomerName(email: string) {
  const local = email.split("@")[0]?.trim();
  return local && local.length > 0 ? local : "AcrossFlare";
}

/** Inicis V2 checkout requires a Korean mobile number. */
export function portoneCustomerPhone(value: string | null | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");
  let mobile = digits;
  if (digits.startsWith("82") && digits.length >= 11) {
    mobile = `0${digits.slice(2)}`;
  }
  if (!/^010\d{8}$/.test(mobile)) {
    return null;
  }
  return `${mobile.slice(0, 3)}-${mobile.slice(3, 7)}-${mobile.slice(7)}`;
}
