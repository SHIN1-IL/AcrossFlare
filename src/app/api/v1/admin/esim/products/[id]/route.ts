import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/admin-auth";
import { writeAdminAudit } from "@/lib/admin-audit";
import { parseEsimProductPatch } from "@/lib/esim/catalog";
import { toProduct } from "@/lib/esim/store";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireOwner();
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const current = await prisma.esimProduct.findUnique({ where: { id } });
  if (!current) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
    dataGb?: unknown;
    days?: unknown;
    priceKrw?: unknown;
    priceUsd?: unknown;
    priceCny?: unknown;
    priceJpy?: unknown;
  } | null;
  const next = body ? parseEsimProductPatch(toProduct(current), body) : null;
  if (!next) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const product = await prisma.esimProduct.update({
    where: { id },
    data: {
      name: next.name,
      dataGb: next.dataGb,
      days: next.days,
      priceKrw: next.priceKrw,
      priceUsd: next.priceUsd,
      priceCny: next.priceCny,
      priceJpy: next.priceJpy,
    },
  });
  await writeAdminAudit({
    actor: auth.user,
    action: "esim_product_update",
    targetType: "esim_product",
    targetId: product.id,
    meta: {
      name: product.name,
      dataGb: product.dataGb,
      days: product.days,
      priceKrw: product.priceKrw,
      priceUsd: product.priceUsd,
      priceCny: product.priceCny,
      priceJpy: product.priceJpy,
    },
  });

  return NextResponse.json({ product: toProduct(product) });
}
