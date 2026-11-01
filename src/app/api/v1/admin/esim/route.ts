import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/admin-auth";
import { writeAdminAudit } from "@/lib/admin-audit";
import { ESIM_SETTINGS_ID, parseEsimCopy } from "@/lib/esim/catalog";
import { ensureEsimCatalog, toProduct } from "@/lib/esim/store";
import { prisma } from "@/lib/db";

export async function GET() {
  const auth = await requireOwner();
  if ("response" in auth) {
    return auth.response;
  }

  const catalog = await ensureEsimCatalog();
  return NextResponse.json({
    enabled: catalog.settings.enabled,
    copy: {
      copyNoWifi: catalog.settings.copyNoWifi,
      copyRefund: catalog.settings.copyRefund,
      copyKorea: catalog.settings.copyKorea,
      copyExit: catalog.settings.copyExit,
      copyYear: catalog.settings.copyYear,
    },
    products: catalog.products.map(toProduct),
  });
}

export async function PATCH(request: Request) {
  const auth = await requireOwner();
  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as
    | {
        enabled?: boolean;
        copyNoWifi?: string;
        copyRefund?: string;
        copyKorea?: string;
        copyExit?: string;
        copyYear?: string;
      }
    | null;
  if (!body) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  await ensureEsimCatalog();
  const copy = parseEsimCopy(body);
  if (!copy || typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const settings = await prisma.esimSettings.update({
    where: { id: ESIM_SETTINGS_ID },
    data: { enabled: body.enabled, ...copy },
  });
  await writeAdminAudit({
    actor: auth.user,
    action: settings.enabled ? "esim_enable" : "esim_disable",
    targetType: "esim_settings",
    targetId: settings.id,
    meta: { enabled: settings.enabled },
  });

  return NextResponse.json({ enabled: settings.enabled });
}
