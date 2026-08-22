import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const credential = await prisma.credential.findUnique({
    where: { yamlToken: token },
    include: {
      subscription: {
        select: { status: true },
      },
    },
  });

  if (!credential?.yamlBody || credential.subscription.status !== "ACTIVE") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new NextResponse(credential.yamlBody, {
    status: 200,
    headers: {
      "Content-Type": "text/yaml; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
