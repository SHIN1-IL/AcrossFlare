import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { filterAdminState } from "@/lib/admin-permissions";
import { listAdminState } from "@/lib/admin-data";
import { isAdminServiceId, type AdminServiceId } from "@/lib/admin-service";
import { isAdminStatePart, type AdminStatePart } from "@/lib/admin-state";
import { isChinaCheckRunning } from "@/lib/china-reachability/run";

function parseParts(value: string | null): AdminStatePart[] | undefined {
  if (!value) {
    return undefined;
  }
  const parts = value.split(",").filter(isAdminStatePart);
  return parts.length ? parts : undefined;
}

function parseServices(value: string | null): AdminServiceId[] | undefined {
  if (!value) {
    return undefined;
  }
  const services = value.split(",").filter(isAdminServiceId);
  return services.length ? services : undefined;
}

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) {
    return auth.response;
  }

  const url = new URL(request.url);
  return NextResponse.json(
    {
      ...filterAdminState(
        await listAdminState({
          parts: parseParts(url.searchParams.get("parts")),
          services: parseServices(url.searchParams.get("services")),
        }),
        auth.user.permissions
      ),
      chinaCheckRunning: isChinaCheckRunning(),
    },
    {
      headers: { "Cache-Control": "private, no-store" },
    }
  );
}
