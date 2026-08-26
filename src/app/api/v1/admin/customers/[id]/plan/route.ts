import { NextResponse } from "next/server";
import { AdminActionError, changeCustomerPlan } from "@/lib/admin-actions";
import { requirePermission } from "@/lib/admin-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("customers");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | { toPlanId?: string; simulateFail?: boolean }
    | null;

  if (!body?.toPlanId) {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }

  try {
    const result = await changeCustomerPlan({
      customerId: id,
      toPlanId: body.toPlanId,
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
