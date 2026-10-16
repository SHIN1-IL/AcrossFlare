import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/admin-auth";
import { toAdminBootstrapJob } from "@/lib/bootstrap/run";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("nodes");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const job = await prisma.nodeBootstrapJob.findUnique({ where: { id } });
  if (!job) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ job: toAdminBootstrapJob(job) });
}
