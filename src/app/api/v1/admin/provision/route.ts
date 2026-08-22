import { NextResponse } from "next/server";
import { AdminActionError, provisionManually } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/admin-auth";
import { isProductId } from "@/lib/plans";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as
    | {
        product?: string;
        email?: string;
        planId?: string;
        expiresAt?: string;
        memo?: string;
        simulateFail?: boolean;
      }
    | null;

  if (!body || !isProductId(body.product) || !body.email || !body.planId || !body.expiresAt) {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }

  try {
    const result = await provisionManually({
      product: body.product,
      email: body.email,
      planId: body.planId,
      expiresAt: body.expiresAt,
      memo: body.memo ?? "",
      simulateFail: Boolean(body.simulateFail),
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    throw error;
  }
}
