import { NextResponse } from "next/server";
import { allowSupportChat, askSupport, parseSupportChatBody, supportChatClientKey } from "@/lib/support-chat";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400, headers: noStore });
  }

  const parsed = parseSupportChatBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: "invalid" }, { status: 400, headers: noStore });
  }

  if (!allowSupportChat(supportChatClientKey(request.headers))) {
    return NextResponse.json({ error: "rate" }, { status: 429, headers: noStore });
  }

  const result = await askSupport(parsed);
  if ("error" in result) {
    const status = result.error === "unconfigured" ? 503 : 502;
    return NextResponse.json({ error: result.error }, { status, headers: noStore });
  }

  return NextResponse.json({ reply: result.reply }, { headers: noStore });
}
