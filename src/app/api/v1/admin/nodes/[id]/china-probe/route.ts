import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { customerConnectTarget } from "@/lib/china-reachability/classify";
import { chinaProbeUrl } from "@/lib/china-reachability/pingpe";
import { prisma } from "@/lib/db";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("nodes");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await context.params;
  const node = await prisma.node.findUnique({
    where: { id },
    select: { host: true, ddns: true, vlessPort: true, entryHost: true, entryPort: true },
  });
  const target = node ? customerConnectTarget(node) : null;
  if (!target) {
    return NextResponse.json({ error: "no_address" }, { status: 404 });
  }

  return NextResponse.redirect(chinaProbeUrl(target.host, target.port));
}
