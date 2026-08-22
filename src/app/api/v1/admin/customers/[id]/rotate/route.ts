import { NextResponse } from "next/server";
import { AdminActionError, rotateAdminCustomer } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/admin-auth";
import { RotateError } from "@/lib/marketing/rotate";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;

  try {
    const customer = await rotateAdminCustomer(id);
    return NextResponse.json({ customer });
  } catch (error) {
    if (error instanceof RotateError) {
      const status = error.code === "locked" ? 409 : error.code === "not_found" ? 404 : 400;
      return NextResponse.json({ error: error.code, lockedUntil: error.lockedUntil }, { status });
    }

    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    throw error;
  }
}
