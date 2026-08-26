import { NextResponse } from "next/server";
import { addAdminNode, AdminActionError } from "@/lib/admin-actions";
import { requirePermission } from "@/lib/admin-auth";
import { parseNodeRole, toAdminNode } from "@/lib/admin-data";
import { isProductId } from "@/lib/plans";

export async function POST(request: Request) {
  const auth = await requirePermission("nodes");
  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as
    | {
        product?: string;
        name?: string;
        ddns?: string;
        role?: string;
        host?: string;
        port?: string | number;
        username?: string;
        password?: string;
      }
    | null;

  const role = parseNodeRole(body?.role);
  if (!body || !isProductId(body.product) || !role) {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }

  try {
    const node = await addAdminNode({
      product: body.product,
      name: body.name ?? "",
      ddns: body.ddns ?? "",
      role,
      host: body.host ?? "",
      port: Number(body.port) || 2053,
      username: body.username ?? "",
      password: body.password ?? "",
    });

    return NextResponse.json({ node: toAdminNode(node) });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    throw error;
  }
}
