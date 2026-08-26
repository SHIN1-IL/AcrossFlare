import { NextResponse } from "next/server";
import { AdminActionError, migrateNodeUsers } from "@/lib/admin-actions";
import { requirePermission } from "@/lib/admin-auth";
import { isProductId } from "@/lib/plans";

export async function POST(request: Request) {
  const auth = await requirePermission("nodes");
  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as
    | { product?: string; fromNodeId?: string; toNodeId?: string }
    | null;

  if (!body || !isProductId(body.product) || !body.fromNodeId || !body.toNodeId) {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }

  try {
    const result = await migrateNodeUsers({
      product: body.product,
      fromNodeId: body.fromNodeId,
      toNodeId: body.toNodeId,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    throw error;
  }
}
