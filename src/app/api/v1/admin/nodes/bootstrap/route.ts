import { NextResponse } from "next/server";
import { writeAdminAudit } from "@/lib/admin-audit";
import { requirePermission } from "@/lib/admin-auth";
import { parseNodeProvider, parseNodeRole } from "@/lib/admin-data";
import {
  BootstrapError,
  createBootstrapJob,
  runBootstrapJob,
  toAdminBootstrapJob,
} from "@/lib/bootstrap/run";
import { isProductId } from "@/lib/plans";
import { toPrismaProduct } from "@/lib/product";

export const maxDuration = 600;

export async function POST(request: Request) {
  const auth = await requirePermission("nodes");
  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as
    | {
        product?: string;
        role?: string;
        provider?: string;
        poolId?: string;
        groupId?: string;
        name?: string;
        ddnsHost?: string;
        sshHost?: string;
        sshPort?: number | string;
        sshUser?: string;
        sshPassword?: string;
        sshPrivateKey?: string;
        panelPort?: number | string;
        vlessPort?: number | string;
        realityDest?: string;
      }
    | null;

  const role = parseNodeRole(body?.role ?? "primary");
  if (!body || !isProductId(body.product) || !role) {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }

  if (!body.sshPassword?.trim() && !body.sshPrivateKey?.trim()) {
    return NextResponse.json({ error: "ssh_auth_missing" }, { status: 400 });
  }

  try {
    const job = await createBootstrapJob({
      product: toPrismaProduct(body.product),
      role,
      provider: parseNodeProvider(body.provider),
      poolId: body.poolId?.trim() || null,
      groupId: body.groupId?.trim() || null,
      name: body.name ?? "",
      ddnsHost: body.ddnsHost ?? "",
      sshHost: body.sshHost ?? "",
      sshPort: Number(body.sshPort) || 22,
      sshUser: body.sshUser,
      panelPort: Number(body.panelPort) || 2053,
      vlessPort: Number(body.vlessPort) || 443,
      realityDest: body.realityDest,
    });

    await writeAdminAudit({
      actor: auth.user,
      action: "node_bootstrap_start",
      targetType: "bootstrap_job",
      targetId: job.id,
      meta: { name: job.name, sshHost: job.sshHost },
    });

    // Run in-request so Docker/Node origin keeps the work; maxDuration=600.
    const finished = await runBootstrapJob(job.id, {
      sshPassword: body.sshPassword,
      sshPrivateKey: body.sshPrivateKey,
    });

    if (finished.status === "SUCCEEDED" && finished.nodeId) {
      await writeAdminAudit({
        actor: auth.user,
        action: "node_bootstrap_ok",
        targetType: "node",
        targetId: finished.nodeId,
        meta: { jobId: job.id },
      });
    }

    return NextResponse.json({
      job: toAdminBootstrapJob(finished),
      ok: finished.status === "SUCCEEDED",
    });
  } catch (error) {
    if (error instanceof BootstrapError) {
      return NextResponse.json({ error: error.code }, { status: 400 });
    }
    throw error;
  }
}
