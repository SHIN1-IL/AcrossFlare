import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { karingSubscriptionHeaders, withBackupNotice } from "@/lib/provision/subscription";

export async function serveKaringSubscription(token: string) {
  const credential = await prisma.credential.findUnique({
    where: { yamlToken: token },
    include: {
      subscription: {
        select: {
          status: true,
          expiresAt: true,
          trafficUsedGb: true,
          plan: { select: { trafficGb: true } },
        },
      },
    },
  });

  if (!credential?.yamlBody || credential.subscription.status !== "ACTIVE") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return new NextResponse(withBackupNotice(credential.yamlBody), {
    status: 200,
    headers: karingSubscriptionHeaders({
      trafficUsedGb: credential.subscription.trafficUsedGb,
      trafficLimitGb: credential.subscription.plan.trafficGb,
      expiresAt: credential.subscription.expiresAt,
    }),
  });
}
