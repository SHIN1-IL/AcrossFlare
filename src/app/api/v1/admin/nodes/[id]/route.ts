import { NextResponse } from "next/server";
import { writeAdminAudit } from "@/lib/admin-audit";
import { AdminActionError, removeAdminNode, updateAdminNode } from "@/lib/admin-actions";
import { requirePermission } from "@/lib/admin-auth";
import { parseNodeRole, toAdminNode } from "@/lib/admin-data";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("nodes");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | {
        name?: string;
        ddns?: string;
        role?: string;
        host?: string;
        port?: string | number;
        username?: string;
        password?: string;
        inboundId?: string | number | null;
        vlessPort?: string | number;
        realityPublicKey?: string;
        realityShortId?: string;
        realityServerName?: string;
        realityFingerprint?: string;
      }
    | null;

  const role = parseNodeRole(body?.role);
  if (!body || !role) {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }

  try {
    const node = await updateAdminNode(id, {
      name: body.name ?? "",
      ddns: body.ddns ?? "",
      role,
      host: body.host ?? "",
      port: Number(body.port) || 2053,
      username: body.username ?? "",
      password: body.password ?? "",
      inboundId: body.inboundId == null || body.inboundId === "" ? null : Number(body.inboundId),
      vlessPort: Number(body.vlessPort) || 443,
      realityPublicKey: body.realityPublicKey,
      realityShortId: body.realityShortId,
      realityServerName: body.realityServerName,
      realityFingerprint: body.realityFingerprint,
    });

    await writeAdminAudit({
      actor: auth.user,
      action: "node_update",
      targetType: "node",
      targetId: node.id,
      meta: { name: node.name },
    });

    return NextResponse.json({ node: toAdminNode(node) });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    throw error;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission("nodes");
  if ("response" in auth) {
    return auth.response;
  }

  const { id } = await params;

  try {
    await removeAdminNode(id);
    await writeAdminAudit({
      actor: auth.user,
      action: "node_delete",
      targetType: "node",
      targetId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    throw error;
  }
}
