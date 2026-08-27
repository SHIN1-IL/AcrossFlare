import { NextResponse } from "next/server";
import { writeAdminAudit } from "@/lib/admin-audit";
import { AdminActionError, retryCustomerProvision } from "@/lib/admin-actions";
import { requirePermission } from "@/lib/admin-auth";
import { getAdminCustomer } from "@/lib/admin-data";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("provision");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const result = await retryCustomerProvision(id);
    await writeAdminAudit({
      actor: auth.user,
      action: "retry",
      targetType: "subscription",
      targetId: id,
      meta: { status: result.customer.status },
    });
    const customer = (await getAdminCustomer(id)) ?? result.customer;
    return NextResponse.json({ customer });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    throw error;
  }
}
