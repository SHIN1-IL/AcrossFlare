import { NextResponse } from "next/server";
import { writeAdminAudit } from "@/lib/admin-audit";
import { AdminActionError, provisionManually } from "@/lib/admin-actions";
import { requirePermission } from "@/lib/admin-auth";
import { getAdminCustomer } from "@/lib/admin-data";
import { isProductId } from "@/lib/plans";

export async function POST(request: Request) {
  const auth = await requirePermission("provision");
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
    await writeAdminAudit({
      actor: auth.user,
      action: "provision",
      targetType: "subscription",
      targetId: result.customer.id,
      meta: { email: result.customer.email, planId: body.planId },
    });
    const customer = (await getAdminCustomer(result.customer.id)) ?? result.customer;
    return NextResponse.json({ ...result, customer });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    throw error;
  }
}
