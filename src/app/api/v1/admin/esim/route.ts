import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/admin-auth";
import { writeAdminAudit } from "@/lib/admin-audit";
import { ESIM_SETTINGS_ID, parseEsimCopy } from "@/lib/esim/catalog";
import { applyEsimSaleLock } from "@/lib/esim/lock";
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
    enabledLocked: catalog.settings.enabledLocked,
    autoIssue: catalog.settings.autoIssue,
    autoIssueLocked: catalog.settings.autoIssueLocked,
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
        action?: string;
        enabled?: boolean;
        autoIssue?: boolean;
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

  const catalog = await ensureEsimCatalog();

  if (body.action === "lock" || body.action === "unlock") {
    const result = applyEsimSaleLock(
      { enabled: catalog.settings.enabled, enabledLocked: catalog.settings.enabledLocked },
      body.action,
      body.enabled
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.error === "locked" ? 409 : 400 });
    }
    const settings = await prisma.esimSettings.update({
      where: { id: ESIM_SETTINGS_ID },
      data: result.next,
    });
    await writeAdminAudit({
      actor: auth.user,
      action: body.action === "lock" ? (settings.enabled ? "esim_lock_on" : "esim_lock_off") : "esim_unlock",
      targetType: "esim_settings",
      targetId: settings.id,
      meta: { enabled: settings.enabled, enabledLocked: settings.enabledLocked },
    });
    return NextResponse.json({ enabled: settings.enabled, enabledLocked: settings.enabledLocked });
  }

  if (body.action === "issue_lock" || body.action === "issue_unlock") {
    const result = applyEsimSaleLock(
      { enabled: catalog.settings.autoIssue, enabledLocked: catalog.settings.autoIssueLocked },
      body.action === "issue_lock" ? "lock" : "unlock",
      body.autoIssue
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.error === "locked" ? 409 : 400 });
    }
    const settings = await prisma.esimSettings.update({
      where: { id: ESIM_SETTINGS_ID },
      data: { autoIssue: result.next.enabled, autoIssueLocked: result.next.enabledLocked },
    });
    await writeAdminAudit({
      actor: auth.user,
      action:
        body.action === "issue_lock"
          ? settings.autoIssue
            ? "esim_issue_lock_on"
            : "esim_issue_lock_off"
          : "esim_issue_unlock",
      targetType: "esim_settings",
      targetId: settings.id,
      meta: { autoIssue: settings.autoIssue, autoIssueLocked: settings.autoIssueLocked },
    });
    return NextResponse.json({ autoIssue: settings.autoIssue, autoIssueLocked: settings.autoIssueLocked });
  }

  const copy = parseEsimCopy(body);
  if (!copy) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const settings = await prisma.esimSettings.update({
    where: { id: ESIM_SETTINGS_ID },
    data: copy,
  });
  await writeAdminAudit({
    actor: auth.user,
    action: "esim_copy",
    targetType: "esim_settings",
    targetId: settings.id,
    meta: { enabled: settings.enabled, enabledLocked: settings.enabledLocked },
  });

  return NextResponse.json({ enabled: settings.enabled, enabledLocked: settings.enabledLocked });
}
