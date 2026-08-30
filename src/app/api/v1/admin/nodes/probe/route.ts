import { NextResponse } from "next/server";
import { AdminActionError, probeAdminPanel } from "@/lib/admin-actions";
import { writeAdminAudit } from "@/lib/admin-audit";
import { requirePermission } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const auth = await requirePermission("nodes");
  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as
    | {
        id?: string;
        host?: string;
        port?: string | number;
        username?: string;
        password?: string;
      }
    | null;

  try {
    const result = await probeAdminPanel({
      id: body?.id?.trim() || undefined,
      host: body?.host,
      port: body?.port == null || body.port === "" ? undefined : Number(body.port),
      username: body?.username,
      password: body?.password,
    });

    if (body?.id && result.ok) {
      await writeAdminAudit({
        actor: auth.user,
        action: "node_probe",
        targetType: "node",
        targetId: body.id,
        meta: { inbounds: result.inbounds.length },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    throw error;
  }
}
