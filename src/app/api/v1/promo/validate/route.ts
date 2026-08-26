import { NextResponse } from "next/server";
import { lookupPromoCode } from "@/lib/promo";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { code?: string; planId?: string } | null;
  const result = await lookupPromoCode(body?.code ?? "");
  if (!result.ok || (body?.planId && result.planId !== body.planId)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  return NextResponse.json({
    code: result.code,
    planId: result.planId,
    product: result.product,
  });
}
