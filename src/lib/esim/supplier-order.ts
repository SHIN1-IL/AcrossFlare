import { EsimOrderStatus } from "@prisma/client";
import { liveSupplierClient } from "@/lib/esim/access-client";
import { ESIM_SETTINGS_ID } from "@/lib/esim/catalog";
import { prisma } from "@/lib/db";
import { notifyOpsEsim } from "@/lib/ops-notify";
import { cancelPaidEsim, gateNewEsimSale, placePaidEsim, type PlacementOrder } from "@/lib/esim/supplier-place";
import { supplierLive } from "@/lib/esim/supplier-policy";

async function autoIssueEnabled() {
  if (!supplierLive()) {
    return false;
  }
  const settings = await prisma.esimSettings.findUnique({
    where: { id: ESIM_SETTINGS_ID },
    select: { autoIssue: true },
  });
  return settings?.autoIssue === true;
}

export async function guardNewEsimSale(productId: string, retailKrw: number) {
  if (!(await autoIssueEnabled())) {
    return { ok: true as const };
  }
  const gate = await gateNewEsimSale(productId, retailKrw, liveSupplierClient());
  if (!gate.ok) {
    void notifyOpsEsim("새 데이터 판매를 멈춤", [
      `사유: ${gate.reason}`,
      `내용: ${gate.detail}`,
      "이미 결제된 주문은 그대로 두고, 새 결제만 받지 않습니다.",
    ]);
  }
  return gate;
}

export async function placePaidEsimOrder(paymentId: string) {
  if (!(await autoIssueEnabled())) {
    return;
  }
  const row = await prisma.esimOrder.findUnique({ where: { paymentId } });
  if (!row) {
    return;
  }
  await placePaidEsim(toPlacement(row), liveSupplierClient(), (patch) => savePlacement(row.id, patch), (reason, detail) => {
    void notifyOpsEsim("데이터 발급 보류", [`결제: ${paymentId}`, `사유: ${reason}`, `내용: ${detail}`]);
  });
}

export async function retryPendingEsimOrders(userId?: string) {
  if (!(await autoIssueEnabled())) {
    return;
  }
  const rows = await prisma.esimOrder.findMany({
    where: {
      status: EsimOrderStatus.AWAITING_QR,
      ...(userId ? { userId } : {}),
      OR: [{ supplierOrderNo: { not: "" } }, { supplierAttempts: { lt: 3 } }],
    },
    orderBy: { createdAt: "asc" },
    take: 3,
  });
  for (const row of rows) {
    await placePaidEsimOrder(row.paymentId);
  }
}

export async function cancelSupplierOrder(order: {
  paymentId: string;
  supplierOrderNo: string;
  supplierIccid: string;
}) {
  if (!order.supplierOrderNo && !order.supplierIccid) {
    return "local" as const;
  }
  if (!supplierLive()) {
    return "failed" as const;
  }
  return cancelPaidEsim(order, liveSupplierClient());
}

function toPlacement(row: {
  paymentId: string;
  productId: string;
  priceKrw: number;
  status: EsimOrderStatus;
  qrText: string;
  supplierOrderNo: string;
  supplierIccid: string;
  supplierAttempts: number;
  supplierError: string;
}): PlacementOrder {
  return {
    paymentId: row.paymentId,
    productId: row.productId,
    priceKrw: row.priceKrw,
    status: row.status,
    qrText: row.qrText,
    supplierOrderNo: row.supplierOrderNo,
    supplierIccid: row.supplierIccid,
    supplierAttempts: row.supplierAttempts,
    supplierError: row.supplierError,
  };
}

function savePlacement(
  id: string,
  patch: Partial<
    Pick<
      PlacementOrder,
      "status" | "qrText" | "supplierOrderNo" | "supplierIccid" | "supplierAttempts" | "supplierError"
    >
  >
) {
  return prisma.esimOrder.update({
    where: { id },
    data: {
      ...patch,
      ...(patch.status === "READY" ? { status: EsimOrderStatus.READY } : {}),
    },
  });
}
