import { NextResponse } from "next/server";
import { serveKaringSubscription } from "@/lib/provision/serve-subscription";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return serveKaringSubscription(token);
}

export async function HEAD(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return serveKaringSubscription(token, "HEAD");
}
