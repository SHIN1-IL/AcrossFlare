export const MARGIN_TIME_ZONE = "Asia/Seoul";
const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const MAX_KRW = 1_000_000_000;

export type MarginNodeInput = {
  id: string;
  name: string;
  provider: string;
  monthlyCostKrw: number;
  createdAt: Date;
};

export type MarginPaymentInput = {
  amount: number;
  currency: string;
  plan: {
    priceKrw: number;
    priceUsd: number;
    priceCny: number;
    priceJpy: number;
  };
};

export type MarginAdjustmentInput = {
  id: string;
  label: string;
  amountKrw: number;
  note: string;
  recurring: boolean;
  month: string;
};

export type MarginSnapshot = {
  month: string;
  operatingCostKrw: number;
  customerPaidKrw: number;
  adjustmentKrw: number;
  revenueKrw: number;
  marginKrw: number;
  paymentCount: number;
  unconvertedCount: number;
  nodes: Array<{
    id: string;
    name: string;
    provider: string;
    monthlyCostKrw: number;
  }>;
  adjustments: MarginAdjustmentInput[];
};

export function currentMonthKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MARGIN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return `${year}-${month}`;
}

export function parseMonthKey(value: unknown): string | null {
  if (typeof value !== "string" || !MONTH_PATTERN.test(value)) {
    return null;
  }
  return value;
}

export function shiftMonth(month: string, delta: number): string {
  const parsed = parseMonthKey(month);
  if (!parsed) {
    return currentMonthKey();
  }
  const [year, mon] = parsed.split("-").map(Number);
  const date = new Date(Date.UTC(year, mon - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Inclusive start, exclusive end, in UTC. Korea is UTC+9 with no daylight saving. */
export function seoulMonthRange(month: string): { start: Date; end: Date } {
  const parsed = parseMonthKey(month) ?? currentMonthKey();
  const [year, mon] = parsed.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, mon - 1, 1, -9)),
    end: new Date(Date.UTC(year, mon, 1, -9)),
  };
}

export function paymentToKrw(payment: MarginPaymentInput): number {
  const amount = Math.round(payment.amount);
  if (!Number.isFinite(amount) || amount === 0) {
    return 0;
  }

  const currency = payment.currency.trim().toUpperCase();
  if (currency === "KRW") {
    return amount;
  }

  const foreign =
    currency === "USD"
      ? payment.plan.priceUsd
      : currency === "CNY"
        ? payment.plan.priceCny
        : currency === "JPY"
          ? payment.plan.priceJpy
          : 0;
  if (foreign <= 0 || payment.plan.priceKrw <= 0) {
    return 0;
  }

  return Math.round((amount * payment.plan.priceKrw) / foreign);
}

export function adjustmentApplies(entry: { month: string; recurring: boolean }, month: string): boolean {
  if (!parseMonthKey(entry.month) || !parseMonthKey(month)) {
    return false;
  }
  if (entry.recurring) {
    return entry.month <= month;
  }
  return entry.month === month;
}

export function buildMarginSnapshot(input: {
  month: string;
  nodes: MarginNodeInput[];
  payments: MarginPaymentInput[];
  adjustments: MarginAdjustmentInput[];
}): MarginSnapshot {
  const month = parseMonthKey(input.month) ?? currentMonthKey();
  const { end } = seoulMonthRange(month);
  const nodes = input.nodes
    .filter((node) => node.createdAt < end)
    .map((node) => ({
      id: node.id,
      name: node.name,
      provider: node.provider,
      monthlyCostKrw: clampKrw(node.monthlyCostKrw, true),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  let customerPaidKrw = 0;
  let unconvertedCount = 0;
  for (const payment of input.payments) {
    const krw = paymentToKrw(payment);
    const currency = payment.currency.trim().toUpperCase();
    if (krw === 0 && payment.amount > 0 && currency !== "KRW") {
      unconvertedCount += 1;
    }
    customerPaidKrw += krw;
  }

  const adjustments = input.adjustments
    .filter((entry) => adjustmentApplies(entry, month))
    .map((entry) => ({
      ...entry,
      amountKrw: clampKrw(entry.amountKrw, false),
      label: entry.label.trim(),
      note: entry.note.trim(),
    }));
  const adjustmentKrw = adjustments.reduce((sum, entry) => sum + entry.amountKrw, 0);
  const operatingCostKrw = nodes.reduce((sum, node) => sum + node.monthlyCostKrw, 0);
  const revenueKrw = customerPaidKrw + adjustmentKrw;

  return {
    month,
    operatingCostKrw,
    customerPaidKrw,
    adjustmentKrw,
    revenueKrw,
    marginKrw: revenueKrw - operatingCostKrw,
    paymentCount: input.payments.length,
    unconvertedCount,
    nodes,
    adjustments,
  };
}

export function parseKrwAmount(value: unknown, allowZero: boolean): number | null {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value.trim().replace(/,/g, ""))
        ? Number(value.trim().replace(/,/g, ""))
        : Number.NaN;
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > MAX_KRW) {
    return null;
  }
  if (!allowZero && numeric === 0) {
    return null;
  }
  return numeric;
}

export function parseCostUpdates(body: unknown): Array<{ id: string; monthlyCostKrw: number }> | null {
  if (!body || typeof body !== "object" || !Array.isArray((body as { nodes?: unknown }).nodes)) {
    return null;
  }

  const rows = (body as { nodes: unknown[] }).nodes;
  if (rows.length === 0 || rows.length > 200) {
    return null;
  }

  const byId = new Map<string, number>();
  for (const row of rows) {
    if (!row || typeof row !== "object") {
      return null;
    }
    const id = (row as { id?: unknown }).id;
    const monthlyCostKrw = parseKrwAmount((row as { monthlyCostKrw?: unknown }).monthlyCostKrw, true);
    if (typeof id !== "string" || !id.trim() || monthlyCostKrw == null) {
      return null;
    }
    byId.set(id.trim(), monthlyCostKrw);
  }

  return [...byId.entries()].map(([id, monthlyCostKrw]) => ({ id, monthlyCostKrw }));
}

export function parseAdjustmentBody(
  body: unknown,
  fallbackMonth: string
): { label: string; amountKrw: number; note: string; recurring: boolean; month: string } | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as {
    label?: unknown;
    amountKrw?: unknown;
    note?: unknown;
    recurring?: unknown;
    month?: unknown;
  };
  const label = typeof record.label === "string" ? record.label.trim() : "";
  const note = typeof record.note === "string" ? record.note.trim() : "";
  const amountKrw = parseKrwAmount(record.amountKrw, false);
  const month = parseMonthKey(record.month) ?? parseMonthKey(fallbackMonth);
  if (!label || label.length > 80 || note.length > 200 || amountKrw == null || !month) {
    return null;
  }
  if (record.recurring != null && typeof record.recurring !== "boolean") {
    return null;
  }

  return {
    label,
    amountKrw,
    note,
    recurring: record.recurring === true,
    month,
  };
}

function clampKrw(value: number, allowZero: boolean): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const rounded = Math.round(value);
  if (rounded < 0 || rounded > MAX_KRW) {
    return 0;
  }
  if (!allowZero && rounded === 0) {
    return 0;
  }
  return rounded;
}
