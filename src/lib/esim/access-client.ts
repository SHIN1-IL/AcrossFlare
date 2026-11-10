import type { SupplierPackage } from "@/lib/esim/supplier-policy";

const BASE_URL = "https://api.esimaccess.com";

export class SupplierRequestError extends Error {
  constructor(
    public code: string,
    message: string,
    public obj: unknown = null
  ) {
    super(message);
    this.name = "SupplierRequestError";
  }
}

export type SupplierProfile = {
  orderNo: string;
  transactionId: string;
  iccid: string;
  ac: string;
  esimStatus: string;
  smdpStatus: string;
};

export type SupplierClient = {
  balanceUsd(): Promise<number>;
  packages(): Promise<SupplierPackage[]>;
  order(input: { transactionId: string; packageCode: string; price: number }): Promise<{ orderNo: string }>;
  query(input: { orderNo?: string; transactionId?: string }): Promise<SupplierProfile | null>;
  cancel(iccid: string): Promise<void>;
};

type ParsedBody =
  | { ok: true; obj: unknown }
  | { ok: false; code: string; message: string; obj: unknown };

export function parseSupplierBody(body: unknown): ParsedBody {
  if (!body || typeof body !== "object") {
    return { ok: false, code: "invalid", message: "Empty supplier response", obj: null };
  }
  const record = body as Record<string, unknown>;
  const success = record.success === true || record.success === "true";
  const code = record.errorCode == null ? "" : String(record.errorCode);
  const message = String(record.errorMsg ?? record.errorMessage ?? "");
  if (!success || (code !== "" && code !== "0" && code !== "000000")) {
    return { ok: false, code: code || "failed", message, obj: record.obj ?? null };
  }
  return { ok: true, obj: record.obj ?? null };
}

export function liveSupplierClient(): SupplierClient {
  return {
    balanceUsd: async () => {
      const obj = asRecord(await post("/api/v1/open/balance/query", {}));
      const raw = numberOr(obj.balance ?? obj.balanceAmount);
      return raw / 10000;
    },
    packages: async () => {
      const obj = await post("/api/v1/open/package/list", { locationCode: "CN", type: "BASE" });
      return asList(obj).map(toPackage).filter((item): item is SupplierPackage => item !== null);
    },
    order: async (input) => {
      const obj = asRecord(
        await post("/api/v1/open/esim/order", {
          transactionId: input.transactionId,
          amount: input.price,
          packageInfoList: [{ packageCode: input.packageCode, count: 1, price: input.price }],
        })
      );
      const orderNo = stringOr(obj.orderNo);
      if (!orderNo) {
        throw new SupplierRequestError("missing_order", "Supplier order number is missing");
      }
      return { orderNo };
    },
    query: async (input) => {
      const obj = await post("/api/v1/open/esim/query", {
        ...(input.orderNo ? { orderNo: input.orderNo } : {}),
        ...(input.transactionId ? { transactionId: input.transactionId } : {}),
        pager: { pageNum: 1, pageSize: 20 },
      });
      const listed = asList(obj)
        .map(toProfile)
        .filter((item): item is SupplierProfile => item !== null);
      const direct = toProfile(obj);
      const rows = listed.length > 0 ? listed : direct ? [direct] : [];
      if (input.orderNo) {
        return rows.find((row) => row.orderNo === input.orderNo) ?? null;
      }
      if (input.transactionId) {
        return rows.find((row) => row.transactionId === input.transactionId) ?? null;
      }
      return null;
    },
    cancel: async (iccid) => {
      await post("/api/v1/open/esim/cancel", { iccid });
    },
  };
}

async function post(path: string, body: unknown) {
  const accessCode = process.env.ESIM_ACCESS_CODE?.trim() ?? "";
  if (process.env.NODE_ENV !== "production" || !accessCode) {
    throw new SupplierRequestError("offline", "Supplier calls are limited to production");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "RT-AccessCode": accessCode,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const json = (await response.json().catch(() => null)) as unknown;
  const parsed = parseSupplierBody(json);
  if (!response.ok || !parsed.ok) {
    const code = parsed.ok ? String(response.status) : parsed.code;
    const message = parsed.ok ? response.statusText : parsed.message;
    throw new SupplierRequestError(code, message, parsed.ok ? null : parsed.obj);
  }
  return parsed.obj;
}

function toPackage(value: unknown): SupplierPackage | null {
  const row = asRecord(value);
  const packageCode = stringOr(row.packageCode);
  const name = stringOr(row.name ?? row.packageName);
  if (!packageCode || !name) {
    return null;
  }
  return {
    packageCode,
    name,
    price: numberOr(row.price),
    volume: numberOr(row.volume),
    duration: numberOr(row.duration),
    durationUnit: stringOr(row.durationUnit),
    type: stringOr(row.type) || undefined,
  };
}

function toProfile(value: unknown): SupplierProfile | null {
  const row = asRecord(value);
  const orderNo = stringOr(row.orderNo);
  const transactionId = stringOr(row.transactionId);
  const iccid = stringOr(row.iccid);
  const ac = stringOr(row.ac ?? row.qrCodeUrl);
  if (!orderNo && !transactionId && !iccid && !ac) {
    return null;
  }
  return {
    orderNo,
    transactionId,
    iccid,
    ac,
    esimStatus: stringOr(row.esimStatus),
    smdpStatus: stringOr(row.smdpStatus),
  };
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  const row = asRecord(value);
  for (const key of ["packageList", "list", "packages", "esimList"]) {
    if (Array.isArray(row[key])) {
      return row[key];
    }
  }
  return [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringOr(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberOr(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}
