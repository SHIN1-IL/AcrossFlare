import { NextResponse } from "next/server";
import { ensureEsimCatalog, toPublicEsimOffer } from "@/lib/esim/store";

export async function GET() {
  const catalog = await ensureEsimCatalog();
  return NextResponse.json(toPublicEsimOffer(catalog));
}
