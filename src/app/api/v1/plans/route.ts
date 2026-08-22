import { NextResponse } from "next/server";
import { listPublicPlans } from "@/lib/admin-data";
import { isProductId } from "@/lib/plans";

export async function GET(request: Request) {
  const product = new URL(request.url).searchParams.get("product");
  const plans = await listPublicPlans(isProductId(product) ? product : undefined);
  return NextResponse.json({ plans });
}
