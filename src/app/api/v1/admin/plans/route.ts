import { NextResponse } from "next/server";
import { AdminActionError, saveAdminPlan } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/admin-auth";
import { isProductId } from "@/lib/plans";

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("response" in auth) {
    return auth.response;
  }

  const body = (await request.json().catch(() => null)) as
    | {
        id?: string;
        product?: string;
        name?: string;
        prices?: { krw?: number; usd?: number; cny?: number; jpy?: number };
        trafficGb?: number | null;
        backupGb?: number | null;
        nodes?: string[];
        visible?: boolean;
        featured?: boolean;
      }
    | null;

  if (!body || !isProductId(body.product) || !body.name || !body.prices) {
    return NextResponse.json({ error: "required" }, { status: 400 });
  }

  try {
    const plan = await saveAdminPlan({
      id: body.id,
      product: body.product,
      name: body.name,
      prices: {
        krw: Number(body.prices.krw) || 0,
        usd: Number(body.prices.usd) || 0,
        cny: Number(body.prices.cny) || 0,
        jpy: Number(body.prices.jpy) || 0,
      },
      trafficGb: body.trafficGb == null || body.trafficGb === undefined ? null : Number(body.trafficGb),
      backupGb: body.backupGb == null || body.backupGb === undefined ? null : Number(body.backupGb),
      nodes: Array.isArray(body.nodes) ? body.nodes.map(String) : [],
      visible: body.visible !== false,
      featured: Boolean(body.featured),
    });

    return NextResponse.json({ plan });
  } catch (error) {
    if (error instanceof AdminActionError) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    throw error;
  }
}
