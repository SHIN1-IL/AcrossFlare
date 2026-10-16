import { PaymentStatus } from "@prisma/client";
import { AdminActionError } from "@/lib/admin-actions";
import { prisma } from "@/lib/db";
import {
  buildMarginSnapshot,
  parseMonthKey,
  seoulMonthRange,
  type MarginSnapshot,
} from "@/lib/margin";

export async function getMarginSnapshot(month: string): Promise<MarginSnapshot> {
  const key = parseMonthKey(month);
  if (!key) {
    throw new AdminActionError("required");
  }

  const { start, end } = seoulMonthRange(key);
  const [nodes, payments, adjustments] = await Promise.all([
    prisma.node.findMany({
      where: { createdAt: { lt: end } },
      select: {
        id: true,
        name: true,
        provider: true,
        monthlyCostKrw: true,
        createdAt: true,
      },
    }),
    prisma.payment.findMany({
      where: {
        status: PaymentStatus.SUCCEEDED,
        createdAt: { gte: start, lt: end },
      },
      select: {
        amount: true,
        currency: true,
        plan: {
          select: {
            priceKrw: true,
            priceUsd: true,
            priceCny: true,
            priceJpy: true,
          },
        },
      },
    }),
    prisma.marginAdjustment.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  return buildMarginSnapshot({ month: key, nodes, payments, adjustments });
}

export async function updateNodeMonthlyCosts(rows: Array<{ id: string; monthlyCostKrw: number }>) {
  const ids = rows.map((row) => row.id);
  const found = await prisma.node.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true },
  });
  if (found.length !== ids.length) {
    throw new AdminActionError("not_found", 404);
  }

  await prisma.$transaction(
    rows.map((row) =>
      prisma.node.update({
        where: { id: row.id },
        data: { monthlyCostKrw: row.monthlyCostKrw },
      })
    )
  );

  return found;
}

export async function createMarginAdjustment(input: {
  label: string;
  amountKrw: number;
  note: string;
  recurring: boolean;
  month: string;
}) {
  return prisma.marginAdjustment.create({ data: input });
}

export async function updateMarginAdjustment(
  id: string,
  input: {
    label: string;
    amountKrw: number;
    note: string;
    recurring: boolean;
    month: string;
  }
) {
  const existing = await prisma.marginAdjustment.findUnique({ where: { id } });
  if (!existing) {
    throw new AdminActionError("not_found", 404);
  }

  return prisma.marginAdjustment.update({ where: { id }, data: input });
}

export async function deleteMarginAdjustment(id: string) {
  const existing = await prisma.marginAdjustment.findUnique({ where: { id } });
  if (!existing) {
    throw new AdminActionError("not_found", 404);
  }

  await prisma.marginAdjustment.delete({ where: { id } });
  return existing;
}
