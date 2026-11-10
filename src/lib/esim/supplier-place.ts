import { SupplierRequestError, type SupplierClient, type SupplierProfile } from "@/lib/esim/access-client";
import {
  ESIM_SUPPLIER_ATTEMPTS,
  canCancelSupplierProfile,
  isPinnedEsimProduct,
  marginAllows,
  selectPackage,
  wholesaleUsd,
} from "@/lib/esim/supplier-policy";

export type PlacementOrder = {
  paymentId: string;
  productId: string;
  priceKrw: number;
  status: "AWAITING_QR" | "READY" | "CANCELLED";
  qrText: string;
  supplierOrderNo: string;
  supplierIccid: string;
  supplierAttempts: number;
  supplierError: string;
};

export type PlacementPatch = Partial<
  Pick<
    PlacementOrder,
    "status" | "qrText" | "supplierOrderNo" | "supplierIccid" | "supplierAttempts" | "supplierError"
  >
>;

export type SaleGate =
  | { ok: true }
  | { ok: false; reason: "package" | "margin" | "balance" | "supplier"; detail: string };

const STOP_CODES = new Set(["200005", "200006", "310241"]);

export function supplierTransactionId(paymentId: string) {
  return paymentId.slice(0, 50);
}

export async function gateNewEsimSale(
  productId: string,
  retailKrw: number,
  client: Pick<SupplierClient, "balanceUsd" | "packages">
): Promise<SaleGate> {
  if (!isPinnedEsimProduct(productId)) {
    return { ok: false, reason: "package", detail: productId };
  }

  let packages;
  let balance: number;
  try {
    packages = await client.packages();
    balance = await client.balanceUsd();
  } catch (error) {
    return { ok: false, reason: "supplier", detail: errorText(error) };
  }

  const floor = selectPackage(packages, "cn-5gb");
  const picked = selectPackage(packages, productId);
  if (!floor || !picked) {
    return { ok: false, reason: "package", detail: productId };
  }
  if (!marginAllows(wholesaleUsd(picked.price), retailKrw)) {
    return {
      ok: false,
      reason: "margin",
      detail: `${productId} wholesale ${wholesaleUsd(picked.price)} retail ${retailKrw}`,
    };
  }
  const balanceUsd = balance;
  if (balanceUsd < wholesaleUsd(floor.price)) {
    return { ok: false, reason: "balance", detail: `balance ${balanceUsd}` };
  }
  if (balanceUsd < wholesaleUsd(picked.price)) {
    return { ok: false, reason: "balance", detail: `${productId} balance ${balanceUsd}` };
  }
  return { ok: true };
}

export async function placePaidEsim(
  order: PlacementOrder,
  client: SupplierClient,
  save: (patch: PlacementPatch) => unknown,
  notify: (reason: string, detail: string) => void
) {
  if (order.status === "CANCELLED" || (order.status === "READY" && order.qrText.trim())) {
    return;
  }

  const current = { ...order };
  const persist = async (patch: PlacementPatch) => {
    Object.assign(current, patch);
    await save(patch);
  };

  if (current.supplierOrderNo) {
    await fillFromQuery(current, client, persist);
    return;
  }

  if (current.supplierAttempts >= ESIM_SUPPLIER_ATTEMPTS) {
    return;
  }

  const transactionId = supplierTransactionId(current.paymentId);
  const existing = await readProfile(client, { transactionId });
  if (existing?.orderNo) {
    await persist(profilePatch(existing));
    return;
  }

  let packages;
  try {
    packages = await client.packages();
  } catch (error) {
    await failAttempt(current, persist, notify, "supplier", errorText(error), false);
    return;
  }

  const picked = selectPackage(packages, current.productId);
  if (!picked) {
    await failAttempt(current, persist, notify, "package", current.productId, true);
    return;
  }

  let balance = 0;
  try {
    balance = await client.balanceUsd();
  } catch (error) {
    await failAttempt(current, persist, notify, "supplier", errorText(error), false);
    return;
  }
  if (balance < wholesaleUsd(picked.price)) {
    await failAttempt(current, persist, notify, "balance", `${current.productId} balance ${balance}`, false);
    return;
  }

  try {
    const ordered = await client.order({
      transactionId,
      packageCode: picked.packageCode,
      price: picked.price,
    });
    await persist({
      supplierOrderNo: ordered.orderNo,
      supplierError: "",
    });
    await fillFromQuery({ ...current, supplierOrderNo: ordered.orderNo }, client, persist);
  } catch (error) {
    if (error instanceof SupplierRequestError && error.code === "310402") {
      const recoveredNo = orderNoFrom(error.obj);
      if (recoveredNo) {
        await persist({ supplierOrderNo: recoveredNo, supplierError: "" });
        await fillFromQuery({ ...current, supplierOrderNo: recoveredNo }, client, persist);
        return;
      }
      const recovered = await readProfile(client, { transactionId });
      if (recovered?.orderNo) {
        await persist(profilePatch(recovered));
        return;
      }
      await failAttempt(current, persist, notify, "duplicate", transactionId, true);
      return;
    }
    const stop = error instanceof SupplierRequestError && STOP_CODES.has(error.code);
    await failAttempt(current, persist, notify, "supplier", errorText(error), stop);
  }
}

export async function cancelPaidEsim(
  order: Pick<PlacementOrder, "supplierOrderNo" | "supplierIccid" | "paymentId">,
  client: Pick<SupplierClient, "query" | "cancel">
): Promise<"cancelled" | "blocked" | "failed"> {
  const transactionId = supplierTransactionId(order.paymentId);
  const profile = await readProfile(client, {
    orderNo: order.supplierOrderNo,
    transactionId,
  });
  const iccid = profile?.iccid || order.supplierIccid;
  if (!profile || !iccid) {
    return "failed";
  }
  if (!canCancelSupplierProfile(profile.esimStatus, profile.smdpStatus)) {
    return "blocked";
  }
  try {
    await client.cancel(iccid);
    return "cancelled";
  } catch (error) {
    if (error instanceof SupplierRequestError && (error.code === "200010" || error.code === "200002")) {
      return "blocked";
    }
    return "failed";
  }
}

async function fillFromQuery(
  order: PlacementOrder,
  client: Pick<SupplierClient, "query">,
  persist: (patch: PlacementPatch) => Promise<void>
) {
  const profile = await readProfile(client, {
    orderNo: order.supplierOrderNo,
    transactionId: supplierTransactionId(order.paymentId),
  });
  if (!profile) {
    await persist({ supplierError: "profile_pending" });
    return;
  }
  await persist(profilePatch(profile));
}

async function readProfile(
  client: Pick<SupplierClient, "query">,
  input: { orderNo?: string; transactionId?: string }
) {
  if (!input.orderNo && !input.transactionId) {
    return null;
  }
  try {
    const profile = await client.query(input);
    if (!profile) {
      return null;
    }
    if (input.orderNo) {
      return !profile.orderNo || profile.orderNo === input.orderNo ? profile : null;
    }
    return profile.transactionId === input.transactionId ? profile : null;
  } catch {
    return null;
  }
}

function profilePatch(profile: SupplierProfile): PlacementPatch {
  const qr = profile.ac.trim();
  return {
    supplierOrderNo: profile.orderNo,
    supplierIccid: profile.iccid,
    supplierError: qr ? "" : "profile_pending",
    ...(qr ? { qrText: qr, status: "READY" as const } : {}),
  };
}

async function failAttempt(
  order: PlacementOrder,
  persist: (patch: PlacementPatch) => Promise<void>,
  notify: (reason: string, detail: string) => void,
  reason: string,
  detail: string,
  stop: boolean
) {
  const attempts = stop ? ESIM_SUPPLIER_ATTEMPTS : order.supplierAttempts + 1;
  await persist({ supplierAttempts: attempts, supplierError: `${reason}: ${detail}`.slice(0, 500) });
  notify(reason, detail);
}

function errorText(error: unknown) {
  if (error instanceof SupplierRequestError) {
    return `${error.code} ${error.message}`.trim();
  }
  return error instanceof Error ? error.message : "supplier";
}

function orderNoFrom(value: unknown) {
  if (!value || typeof value !== "object") {
    return "";
  }
  const orderNo = (value as { orderNo?: unknown }).orderNo;
  return typeof orderNo === "string" ? orderNo.trim() : "";
}
