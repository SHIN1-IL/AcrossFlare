import { serveKaringSubscription } from "@/lib/provision/serve-subscription";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  return serveKaringSubscription(token);
}

export async function HEAD(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  return serveKaringSubscription(token, "HEAD");
}
